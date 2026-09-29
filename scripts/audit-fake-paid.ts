// scripts/audit-fake-paid.ts
//
// READ-ONLY audit for orders that may have been marked "paid" without a real
// gateway payment, via the (now fixed) POST /api/orders hole that trusted a
// client-supplied paymentStatus and credited the vendor ledger.
//
// This script never writes to the database — it only runs find()/aggregate()
// — and never writes to any gateway (only GETs payment/charge lookups when
// --check-gateway is passed).
//
// Usage (run once per region, pointing at that region's DB):
//
//   MONGODB_URI="<india uri>" npx tsx scripts/audit-fake-paid.ts
//   MONGODB_URI="<uae uri>"   npx tsx scripts/audit-fake-paid.ts --json > ae-report.json
//
// Options:
//   --json             Print the full report as JSON instead of text.
//   --check-gateway    Also confirm each payment ID with the gateway (read-only
//                      GETs). Needs RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (India)
//                      and/or TAP_SECRET_KEY (UAE) in the environment.
//   --since=YYYY-MM-DD Only look at orders created on/after this date.
//
// How orders get classified:
//   Section A — paymentMethod != "cod" AND paymentStatus == "completed".
//     The only legitimate way to create these is fulfillPaidOrder()
//     (lib/order-fulfillment.ts), called from the Razorpay/Tap verify routes,
//     which always stores razorpayPaymentId (Razorpay) or gatewayPaymentId (Tap).
//     Flags: NO_GATEWAY_PAYMENT_ID, DUPLICATE_GATEWAY_PAYMENT_ID,
//     COD_ROUTE_ORDER_NUMBER, and with --check-gateway: GATEWAY_LOOKUP_FAILED,
//     GATEWAY_NOT_CAPTURED, GATEWAY_AMOUNT_MISMATCH, GATEWAY_ORDER_MISMATCH.
//   Section B — paymentMethod == "cod" orders that have a SALE ledger entry.
//     Legitimate COD orders never get one (only fulfillPaidOrder records
//     sales), so any SALE entry here came from a client-supplied
//     paymentStatus "completed".
//
// COD_ROUTE_ORDER_NUMBER is a supporting signal only: POST /api/orders
// generates "ORD-<ms>-<0..999>", while fulfillPaidOrder currently generates
// "ORD-<ms>". Older gateway code may have used other formats, so don't treat
// this flag alone as proof.

import mongoose from "mongoose";

type Flag =
  | "NO_GATEWAY_PAYMENT_ID"
  | "DUPLICATE_GATEWAY_PAYMENT_ID"
  | "COD_ROUTE_ORDER_NUMBER"
  | "GATEWAY_LOOKUP_FAILED"
  | "GATEWAY_NOT_CAPTURED"
  | "GATEWAY_AMOUNT_MISMATCH"
  | "GATEWAY_ORDER_MISMATCH"
  | "COD_WITH_SALE_LEDGER_ENTRY";

interface LedgerRow {
  _id: string;
  type: string;
  status: string;
  amount: number;
  shopId: string | null;
  description: string;
  createdAt: Date;
  clearAt: Date | null;
}

interface OrderRow {
  orderId: string;
  orderNumber: string;
  createdAt: Date;
  userId: string | null;
  userEmail: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  orderStatus: string | null;
  totalAmount: number | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentGateway: string | null;
  gatewayPaymentId: string | null;
  shops: string[];
  flags: Flag[];
  gatewayCheck?: string;
  ledgerEntries: LedgerRow[];
  ledgerTotals: { pendingSale: number; clearedSale: number; commission: number };
}

const args = process.argv.slice(2);
const AS_JSON = args.includes("--json");
const CHECK_GATEWAY = args.includes("--check-gateway");
const sinceArg = args.find((a) => a.startsWith("--since="))?.split("=")[1];
const SINCE = sinceArg ? new Date(sinceArg) : null;

const COD_ROUTE_ORDER_NUMBER = /^ORD-\d+-\d{1,3}$/;

function idStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

async function checkRazorpay(order: any): Promise<{ flags: Flag[]; note: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { flags: [], note: "skipped (no Razorpay keys in env)" };
  const res = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}`, {
    headers: { Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64") },
  });
  if (!res.ok) return { flags: ["GATEWAY_LOOKUP_FAILED"], note: `Razorpay HTTP ${res.status}` };
  const p: any = await res.json();
  const flags: Flag[] = [];
  if (p.status !== "captured") flags.push("GATEWAY_NOT_CAPTURED");
  const paid = Number(p.amount) / 100; // paise -> rupees
  if (typeof order.totalAmount === "number" && Math.abs(paid - order.totalAmount) > 0.01) {
    flags.push("GATEWAY_AMOUNT_MISMATCH");
  }
  if (order.razorpayOrderId && p.order_id && p.order_id !== order.razorpayOrderId) {
    flags.push("GATEWAY_ORDER_MISMATCH");
  }
  return { flags, note: `Razorpay status=${p.status} amount=${paid} ${p.currency} order_id=${p.order_id}` };
}

async function checkTap(order: any): Promise<{ flags: Flag[]; note: string }> {
  const secret = process.env.TAP_SECRET_KEY;
  if (!secret) return { flags: [], note: "skipped (no TAP_SECRET_KEY in env)" };
  const res = await fetch(`https://api.tap.company/v2/charges/${order.gatewayPaymentId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return { flags: ["GATEWAY_LOOKUP_FAILED"], note: `Tap HTTP ${res.status}` };
  const c: any = await res.json();
  const flags: Flag[] = [];
  if (c.status !== "CAPTURED") flags.push("GATEWAY_NOT_CAPTURED");
  const paid = Number(c.amount); // Tap amounts are in major units
  if (typeof order.totalAmount === "number" && Math.abs(paid - order.totalAmount) > 0.01) {
    flags.push("GATEWAY_AMOUNT_MISMATCH");
  }
  return { flags, note: `Tap status=${c.status} amount=${paid} ${c.currency}` };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI for the region you want to audit (this script does not read .env files).");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const orders = db.collection("orders");
  const ledger = db.collection("ledgerentries");
  const users = db.collection("users");
  const shops = db.collection("shops");

  const dateFilter = SINCE ? { createdAt: { $gte: SINCE } } : {};

  // ── Section A candidates ────────────────────────────────────────────────
  const paidNonCod = await orders
    .find({ ...dateFilter, paymentStatus: "completed", paymentMethod: { $ne: "cod" } })
    .sort({ createdAt: 1 })
    .toArray();

  // Payment IDs used by more than one order (a replayed/invented ID).
  const idCounts = new Map<string, number>();
  for (const o of paidNonCod) {
    const pid = o.razorpayPaymentId || o.gatewayPaymentId;
    if (pid) idCounts.set(pid, (idCounts.get(pid) || 0) + 1);
  }

  // ── Section B candidates: COD orders with a SALE ledger entry ───────────
  const codOrderIds = (
    await orders.find({ ...dateFilter, paymentMethod: "cod" }, { projection: { _id: 1 } }).toArray()
  ).map((o) => String(o._id));
  const codWithSaleIds = new Set<string>(
    codOrderIds.length
      ? (
          await ledger
            .find({ type: "SALE", referenceType: "ORDER", referenceId: { $in: codOrderIds } })
            .project({ referenceId: 1 })
            .toArray()
        ).map((e) => String(e.referenceId))
      : []
  );
  const codWithSale = codWithSaleIds.size
    ? await orders
        .find({ _id: { $in: [...codWithSaleIds].map((id) => new mongoose.Types.ObjectId(id)) } })
        .sort({ createdAt: 1 })
        .toArray()
    : [];

  const shopNameCache = new Map<string, string>();
  async function shopName(id: string | null): Promise<string> {
    if (!id) return "(none)";
    if (!shopNameCache.has(id)) {
      const s = await shops.findOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { projection: { shopName: 1 } }
      );
      shopNameCache.set(id, s?.shopName ?? `(unknown shop ${id})`);
    }
    return shopNameCache.get(id)!;
  }

  async function buildRow(o: any, flags: Flag[]): Promise<OrderRow> {
    const orderId = String(o._id);
    const entries = await ledger
      .find({ referenceId: orderId, referenceType: "ORDER" })
      .sort({ createdAt: 1 })
      .toArray();
    const u = o.user
      ? await users.findOne({ _id: o.user }, { projection: { email: 1 } })
      : null;
    const shopIds = [...new Set((o.items || []).map((i: any) => idStr(i.shopId)).filter(Boolean))] as string[];

    const ledgerEntries: LedgerRow[] = entries.map((e) => ({
      _id: String(e._id),
      type: e.type,
      status: e.status,
      amount: e.amount,
      shopId: idStr(e.shopId),
      description: e.description,
      createdAt: e.createdAt,
      clearAt: e.clearAt ?? null,
    }));

    const sum = (pred: (e: LedgerRow) => boolean) =>
      ledgerEntries.filter(pred).reduce((s, e) => s + (e.amount || 0), 0);

    return {
      orderId,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      userId: idStr(o.user),
      userEmail: u?.email ?? null,
      paymentMethod: o.paymentMethod ?? null,
      paymentStatus: o.paymentStatus ?? null,
      orderStatus: o.orderStatus ?? null,
      totalAmount: o.totalAmount ?? null,
      razorpayOrderId: o.razorpayOrderId ?? null,
      razorpayPaymentId: o.razorpayPaymentId ?? null,
      paymentGateway: o.paymentGateway ?? null,
      gatewayPaymentId: o.gatewayPaymentId ?? null,
      shops: await Promise.all(shopIds.map(shopName)),
      flags,
      ledgerEntries,
      ledgerTotals: {
        pendingSale: sum((e) => e.type === "SALE" && e.status === "PENDING"),
        clearedSale: sum((e) => e.type === "SALE" && e.status === "CLEARED"),
        commission: sum((e) => e.type === "COMMISSION"),
      },
    };
  }

  const sectionA: OrderRow[] = [];
  let sectionALooksLegit = 0;
  for (const o of paidNonCod) {
    const flags: Flag[] = [];
    const pid = o.razorpayPaymentId || o.gatewayPaymentId;
    if (!pid) flags.push("NO_GATEWAY_PAYMENT_ID");
    if (pid && (idCounts.get(pid) || 0) > 1) flags.push("DUPLICATE_GATEWAY_PAYMENT_ID");
    if (typeof o.orderNumber === "string" && COD_ROUTE_ORDER_NUMBER.test(o.orderNumber)) {
      flags.push("COD_ROUTE_ORDER_NUMBER");
    }

    let gatewayCheck: string | undefined;
    if (CHECK_GATEWAY && pid) {
      try {
        const r =
          o.paymentMethod === "tap" || o.paymentGateway === "tap"
            ? await checkTap(o)
            : await checkRazorpay(o);
        flags.push(...r.flags);
        gatewayCheck = r.note;
      } catch (err) {
        flags.push("GATEWAY_LOOKUP_FAILED");
        gatewayCheck = `error: ${(err as Error).message}`;
      }
    }

    if (flags.length === 0) {
      sectionALooksLegit++;
      continue;
    }
    const row = await buildRow(o, flags);
    row.gatewayCheck = gatewayCheck;
    sectionA.push(row);
  }

  const sectionB: OrderRow[] = [];
  for (const o of codWithSale) {
    sectionB.push(await buildRow(o, ["COD_WITH_SALE_LEDGER_ENTRY"]));
  }

  const report = {
    database: mongoose.connection.name,
    generatedAt: new Date().toISOString(),
    since: SINCE?.toISOString() ?? null,
    gatewayChecked: CHECK_GATEWAY,
    summary: {
      paidNonCodOrders: paidNonCod.length,
      paidNonCodLooksLegit: sectionALooksLegit,
      paidNonCodSuspicious: sectionA.length,
      codOrdersWithSaleLedgerEntry: sectionB.length,
      suspiciousPendingSaleTotal: [...sectionA, ...sectionB].reduce((s, r) => s + r.ledgerTotals.pendingSale, 0),
      suspiciousClearedSaleTotal: [...sectionA, ...sectionB].reduce((s, r) => s + r.ledgerTotals.clearedSale, 0),
    },
    sectionA_paidNonCodSuspicious: sectionA,
    sectionB_codWithSaleLedgerEntry: sectionB,
  };

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }

  await mongoose.disconnect();
}

function printText(report: any) {
  const s = report.summary;
  console.log(`\n=== Fake-paid order audit — DB "${report.database}" — ${report.generatedAt}`);
  if (report.since) console.log(`Orders since: ${report.since}`);
  console.log(`Gateway lookups: ${report.gatewayChecked ? "ON" : "OFF (pass --check-gateway to confirm IDs with Razorpay/Tap)"}`);
  console.log(`\nPaid non-COD orders:              ${s.paidNonCodOrders}`);
  console.log(`  no red flags:                   ${s.paidNonCodLooksLegit}`);
  console.log(`  SUSPICIOUS (section A):         ${s.paidNonCodSuspicious}`);
  console.log(`COD orders with SALE ledger (B):  ${s.codOrdersWithSaleLedgerEntry}`);
  console.log(`Suspicious vendor SALE credits:   pending=${s.suspiciousPendingSaleTotal}  cleared=${s.suspiciousClearedSaleTotal}`);
  console.log(`  (cleared = already moved to withdrawable balance; check payouts for these shops)`);

  const printRows = (title: string, rows: OrderRow[]) => {
    console.log(`\n--- ${title} (${rows.length})`);
    for (const r of rows) {
      console.log(
        `\n* ${r.orderNumber}  id=${r.orderId}  ${new Date(r.createdAt).toISOString()}\n` +
          `  user=${r.userEmail ?? r.userId}  method=${r.paymentMethod} status=${r.paymentStatus} order=${r.orderStatus} total=${r.totalAmount}\n` +
          `  razorpayOrderId=${r.razorpayOrderId} razorpayPaymentId=${r.razorpayPaymentId} gateway=${r.paymentGateway} gatewayPaymentId=${r.gatewayPaymentId}\n` +
          `  shops=${r.shops.join(", ")}\n` +
          `  FLAGS: ${r.flags.join(", ")}` +
          (r.gatewayCheck ? `\n  gateway: ${r.gatewayCheck}` : "")
      );
      if (r.ledgerEntries.length === 0) {
        console.log("  ledger: (no entries)");
      } else {
        for (const e of r.ledgerEntries) {
          console.log(
            `  ledger: ${e.type.padEnd(10)} ${e.status.padEnd(8)} ${String(e.amount).padStart(10)}  shop=${e.shopId ?? "platform"}  entry=${e._id}`
          );
        }
      }
    }
  };

  printRows("Section A: paid non-COD orders with red flags", report.sectionA_paidNonCodSuspicious);
  printRows("Section B: COD orders with a SALE ledger entry", report.sectionB_codWithSaleLedgerEntry);
  console.log("");
}

main().catch(async (err) => {
  console.error("Audit failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

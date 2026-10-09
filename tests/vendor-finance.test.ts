// The admin vendor Finance tab: lib/vendor-finance.ts and
// GET /api/admin/vendors/:id/finance, against an in-memory MongoDB.
//
// Money is moved by the real LedgerService, so the reconciliation is checked
// against what the ledger actually writes for each payout state. Covers: the
// reconciliation per state, every warning detector (found, and not found),
// bank-detail masking, admin-only access, paging, that no response contains
// a full account number, and that looking changes nothing.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let lib: typeof import("@/lib/vendor-finance");
let route: typeof import("@/app/api/admin/vendors/[id]/finance/route");
let LedgerService: typeof import("@/lib/services/ledger-service").LedgerService;

const oid = () => new mongoose.Types.ObjectId();
const DAY = 24 * 60 * 60 * 1000;
const ACCOUNT_NUMBER = "123456789012";
const UPI_ID = "ashadevi@okhdfc";
const admin = { _id: oid(), name: "Priya Admin" };
let seq = 0;

/** A shop with complete bank details. No wallet: that appears with its first recorded sale. */
async function makeShop(over: Record<string, unknown> = {}) {
  const _id = oid();
  const ownerId = oid();
  await db.collection("shops").insertOne({
    _id,
    ownerId,
    shopName: `Shop ${++seq}`,
    slug: `shop-${_id}`,
    isApproved: true,
    isActive: true,
    commissionRate: 10,
    address: { street: "s", city: "c", state: "st", pincode: "400001" },
    contactInfo: { phone: "9", email: `s${seq}@finance.test` },
    bankDetails: {
      accountHolderName: "Asha Devi",
      accountNumber: ACCOUNT_NUMBER,
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      upiId: UPI_ID,
    },
    ...over,
  });
  return { _id, id: String(_id), ownerId };
}
type TestShop = Awaited<ReturnType<typeof makeShop>>;

/** An order with one line for `shop`. Returns its id. */
async function makeOrder(shop: TestShop, over: Record<string, unknown> = {}, earnings = 500) {
  const _id = oid();
  await db.collection("orders").insertOne({
    _id,
    orderNumber: `ORD-${++seq}`,
    user: oid(),
    totalAmount: earnings + 50,
    paymentMethod: "razorpay",
    paymentStatus: "completed",
    orderStatus: "processing",
    items: [
      {
        product: oid(),
        quantity: 1,
        price: earnings + 50,
        shopId: shop._id,
        vendorEarnings: earnings,
        platformCommission: 50,
      },
    ],
    vendorPayouts: [{ shopId: shop._id, amount: earnings, status: "pending" }],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });
  return _id;
}

/** A paid online order whose sale IS in the ledger (pending). */
async function sell(shop: TestShop, earnings: number, over: Record<string, unknown> = {}) {
  const orderId = await makeOrder(shop, over, earnings);
  await LedgerService.recordSale({
    orderId: String(orderId),
    items: [{ shopId: shop.id, vendorEarnings: earnings, commission: 50 }],
  });
  return orderId;
}

/** Runs the real fund-release job for this shop's pending sales. */
async function release(shop: TestShop) {
  await db
    .collection("ledgerentries")
    .updateMany(
      { shopId: shop._id, type: "SALE", status: "PENDING" },
      { $set: { clearAt: new Date(Date.now() - 1000) } }
    );
  await LedgerService.clearPendingFunds();
}

/** A payout request: the Payout record plus the real ledger debit, as the vendor routes do. */
async function requestPayout(shop: TestShop, amount: number, over: Record<string, unknown> = {}) {
  const _id = oid();
  await db.collection("payouts").insertOne({
    _id,
    shopId: shop._id,
    amount,
    idempotencyKey: String(_id),
    status: "REQUESTED",
    isExitSettlement: false,
    bankAccountNumber: `****${ACCOUNT_NUMBER.slice(-4)}`,
    bankIfsc: "HDFC0001234",
    bankName: "HDFC Bank",
    orderIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });
  await LedgerService.requestPayout({ shopId: shop.id, amount, payoutId: String(_id) });
  return _id;
}
const setPayoutStatus = (
  payoutId: mongoose.Types.ObjectId,
  status: string,
  more: Record<string, unknown> = {}
) => db.collection("payouts").updateOne({ _id: payoutId }, { $set: { status, ...more } });

const finance = async (shop: TestShop, options: Record<string, unknown> = {}) =>
  (await lib.getVendorFinance(shop.id, options))!;
const warningOf = (view: { warnings: Array<{ code: string }> }, code: string) =>
  view.warnings.find((w) => w.code === code) as any;
const codes = (view: { warnings: Array<{ code: string }> }) => view.warnings.map((w) => w.code);
const get = (shopId: string, query: Record<string, string | number> = {}) =>
  call(route.GET, `/api/admin/vendors/${shopId}/finance`, { params: { id: shopId }, query });
const asAdmin = () => {
  auth.session = { user: { id: String(admin._id), role: "admin", email: "admin@finance.test" } };
};

beforeAll(async () => {
  db = await startTestDb();
  lib = await import("@/lib/vendor-finance");
  route = await import("@/app/api/admin/vendors/[id]/finance/route");
  ({ LedgerService } = await import("@/lib/services/ledger-service"));
  for (const m of ["payout", "audit-log", "order", "shop", "user"])
    await import(`@/lib/models/${m}`);
  await initModels();
  await db.collection("users").insertOne({
    _id: admin._id,
    email: "admin@finance.test",
    name: admin.name,
    role: "admin",
    isActive: true,
    isVerified: true,
  });
});
afterAll(stopTestDb);

describe("masking", () => {
  it("shows only the last four digits of an account number", () => {
    expect(lib.maskAccountNumber("123456789012")).toBe("••••9012");
    expect(lib.maskAccountNumber("1234 5678 9012")).toBe("••••9012");
    expect(lib.maskAccountNumber("****9012")).toBe("••••9012"); // the snapshot a payout keeps
    expect(lib.maskAccountNumber("12345")).toBe("••••"); // too short to show any of it
    expect(lib.maskAccountNumber("")).toBeNull();
    expect(lib.maskAccountNumber(undefined)).toBeNull();
  });

  it("masks the name part of a UPI id", () => {
    expect(lib.maskUpiId("ashadevi@okhdfc")).toBe("as••••@okhdfc");
    expect(lib.maskUpiId("asha@upi")).toBe("••••@upi"); // short names show nothing
    expect(lib.maskUpiId("")).toBeNull();
  });

  it("masks bank details and says whether they are complete", () => {
    expect(
      lib.maskBankDetails({
        accountHolderName: "Asha Devi",
        accountNumber: ACCOUNT_NUMBER,
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        upiId: UPI_ID,
      })
    ).toEqual({
      accountHolderName: "Asha Devi",
      bankName: "HDFC Bank",
      accountNumber: "••••9012",
      ifscCode: "HDFC0001234",
      swiftCode: null,
      upiId: "as••••@okhdfc",
      isComplete: true,
    });
    expect(
      lib.maskBankDetails({ accountHolderName: "Asha Devi", accountNumber: ACCOUNT_NUMBER })!
        .isComplete
    ).toBe(false);
    expect(lib.maskBankDetails({})).toBeNull();
    expect(lib.maskBankDetails(undefined)).toBeNull();
  });
});

describe("reconciliation, state by state", () => {
  it("matches the ledger through a sale, its release, and a payout that is requested, approved and completed", async () => {
    const shop = await makeShop();

    // Nothing sold: no wallet, and none is invented.
    let view = await finance(shop);
    expect(view.wallet).toBeNull();
    expect(view.reconciliation).toBeNull();

    await sell(shop, 1000);
    view = await finance(shop);
    expect(view.wallet).toMatchObject({
      status: "ACTIVE",
      pendingBalance: 1000,
      withdrawableBalance: 0,
      totalBalance: 1000,
    });
    expect(view.reconciliation).toMatchObject({
      expectedPending: 1000,
      expectedWithdrawable: 0,
      matches: true,
    });

    await release(shop);
    view = await finance(shop);
    expect(view.reconciliation).toMatchObject({
      expectedPending: 0,
      expectedWithdrawable: 1000,
      walletWithdrawable: 1000,
      matches: true,
    });

    // REQUESTED: the wallet is debited at once, while the ledger entry is still PENDING.
    const payout = await requestPayout(shop, 600);
    view = await finance(shop);
    expect(view.wallet).toMatchObject({ pendingBalance: 0, withdrawableBalance: 400 });
    expect(view.reconciliation).toMatchObject({
      expectedPending: 0,
      expectedWithdrawable: 400,
      pendingDifference: 0,
      withdrawableDifference: 0,
      matches: true,
    });
    expect(view.payouts.inFlight).toEqual({ count: 1, amount: 600 });
    // The per-status comparison the service offers calls this same, correct wallet "drifted".
    expect((await LedgerService.computeBalanceFromLedger(shop.id))!.isDrifted).toBe(true);

    await setPayoutStatus(payout, "APPROVED", { approvedAt: new Date() });
    expect((await finance(shop)).reconciliation).toMatchObject({
      expectedWithdrawable: 400,
      matches: true,
    });

    await LedgerService.completePayout(String(payout), String(admin._id), "UTR123");
    await setPayoutStatus(payout, "COMPLETED", {
      transactionId: "UTR123",
      processedAt: new Date(),
    });
    view = await finance(shop);
    expect(view.reconciliation).toMatchObject({
      expectedWithdrawable: 400,
      expectedTotal: 400,
      walletTotal: 400,
      matches: true,
    });
    expect(view.payouts.completed).toEqual({ count: 1, amount: 600 });
    expect(view.payouts.items[0]).toMatchObject({
      status: "COMPLETED",
      bankReference: "UTR123",
      ledger: { debited: true, debitStatus: "CLEARED", reversed: false },
    });
    expect(codes(view)).toEqual([]);
  });

  it("still matches after a payout is rejected and given back", async () => {
    const shop = await makeShop();
    await sell(shop, 1000);
    await release(shop);
    const payout = await requestPayout(shop, 300);
    await setPayoutStatus(payout, "APPROVED");
    await LedgerService.rejectPayout(
      String(payout),
      shop.id,
      300,
      "Bank returned the transfer",
      String(admin._id)
    );
    await setPayoutStatus(payout, "FAILED", { failureReason: "Bank returned the transfer" });

    const view = await finance(shop);
    expect(view.wallet).toMatchObject({ withdrawableBalance: 1000 });
    // The rejected payout's PENDING debit stays in the ledger next to the entry that gives it back.
    expect(view.reconciliation).toMatchObject({ expectedWithdrawable: 1000, matches: true });
    expect(view.payouts.items[0].ledger).toEqual({
      debited: true,
      debitStatus: "PENDING",
      reversed: true,
    });
    expect(codes(view)).toEqual([]);
  });

  it("reports a wallet that disagrees with its ledger", async () => {
    const shop = await makeShop();
    await sell(shop, 1000);
    await release(shop);
    await db
      .collection("wallets")
      .updateOne({ shopId: shop._id }, { $inc: { withdrawableBalance: 50 } }); // not through the ledger

    const view = await finance(shop);
    expect(view.reconciliation).toMatchObject({
      walletWithdrawable: 1050,
      expectedWithdrawable: 1000,
      withdrawableDifference: 50,
      pendingDifference: 0,
      totalDifference: 50,
      matches: false,
    });
    expect(warningOf(view, "LEDGER_MISMATCH")).toMatchObject({
      amount: 50,
      details: { withdrawableDifference: 50, pendingDifference: 0 },
    });
  });

  it("the rule itself: payouts count against withdrawable whatever their status; voided entries count for nothing", () => {
    const result = lib.reconcile({ pendingBalance: 200, withdrawableBalance: 450 }, [
      { type: "SALE", status: "PENDING", count: 2, total: 200 },
      { type: "SALE", status: "CLEARED", count: 5, total: 1000 },
      { type: "PAYOUT", status: "PENDING", count: 2, total: -400 }, // one in flight, one rejected
      { type: "PAYOUT", status: "CLEARED", count: 1, total: -250 },
      { type: "ADJUSTMENT", status: "CLEARED", count: 1, total: 100 }, // the rejected one, given back
      { type: "SALE", status: "VOIDED", count: 1, total: 999 },
    ]);
    expect(result).toMatchObject({
      expectedPending: 200,
      expectedWithdrawable: 450,
      expectedTotal: 650,
      unclassified: 0,
      matches: true,
    });
  });
});

describe("warnings for the known balance problems", () => {
  it("a vendor with ordinary sales has none", async () => {
    const shop = await makeShop();
    await sell(shop, 500);
    await sell(shop, 700, { orderStatus: "delivered" });
    await makeOrder(shop, {
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "pending",
    }); // unpaid COD: nothing is owed yet
    const view = await finance(shop);
    expect(codes(view)).toEqual([]);
    expect(view.scan).toEqual({ ordersScanned: 3, ordersTotal: 3, limited: false });
  });

  it("CANCELLED_ORDER_CREDITED: a cancelled prepaid order whose sale is still in the wallet", async () => {
    const shop = await makeShop();
    const cancelled = await sell(shop, 500, {
      orderStatus: "cancelled",
      orderNumber: "ORD-CANCELLED",
    });
    await sell(shop, 200); // not cancelled: not part of the warning

    let found = warningOf(await finance(shop), "CANCELLED_ORDER_CREDITED");
    expect(found).toMatchObject({ amount: 500, count: 1, details: { refundEntries: 0 } });
    expect(found.items).toEqual([
      expect.objectContaining({
        id: String(cancelled),
        label: "ORD-CANCELLED",
        amount: 500,
        note: expect.stringContaining("Still pending"),
      }),
    ]);

    await release(shop); // the fund-release job does not look at the order's status
    found = warningOf(await finance(shop), "CANCELLED_ORDER_CREDITED");
    expect(found.items[0].note).toContain("Already released");
  });

  it("COD_NOT_IN_WALLET: delivered, paid cash-on-delivery orders (and only those)", async () => {
    const shop = await makeShop();
    const cod = { paymentMethod: "cod" };
    await makeOrder(
      shop,
      { ...cod, orderStatus: "delivered", paymentStatus: "completed", orderNumber: "ORD-COD-PAID" },
      300
    );
    await makeOrder(shop, { ...cod, orderStatus: "delivered", paymentStatus: "pending" }, 111); // cash not collected yet
    await makeOrder(shop, { ...cod, orderStatus: "shipped", paymentStatus: "completed" }, 222); // not delivered yet
    await makeOrder(shop, { ...cod, orderStatus: "cancelled", paymentStatus: "completed" }, 333);

    const view = await finance(shop);
    expect(codes(view)).toEqual(["COD_NOT_IN_WALLET"]);
    expect(warningOf(view, "COD_NOT_IN_WALLET")).toMatchObject({
      amount: 300,
      count: 1,
      items: [expect.objectContaining({ label: "ORD-COD-PAID", amount: 300 })],
    });
    expect(view.wallet).toBeNull(); // COD never creates a wallet either
  });

  it("RELEASE_OVERDUE: pending sales more than two days past their release date", async () => {
    const shop = await makeShop();
    const overdue = await sell(shop, 400, { orderNumber: "ORD-OVERDUE" });
    const due = await sell(shop, 250);
    const setReleaseDate = (orderId: mongoose.Types.ObjectId, daysAgo: number) =>
      db
        .collection("ledgerentries")
        .updateMany(
          { shopId: shop._id, referenceId: String(orderId) },
          { $set: { clearAt: new Date(Date.now() - daysAgo * DAY) } }
        );
    await setReleaseDate(overdue, 3);
    await setReleaseDate(due, 1); // the job runs daily: one day late is normal

    const view = await finance(shop);
    expect(codes(view)).toEqual(["RELEASE_OVERDUE"]);
    expect(warningOf(view, "RELEASE_OVERDUE")).toMatchObject({
      amount: 400,
      count: 1,
      items: [expect.objectContaining({ label: "ORD-OVERDUE", amount: 400 })],
    });
    // "Now" a week later, both are overdue.
    expect(
      warningOf(await finance(shop, { now: new Date(Date.now() + 7 * DAY) }), "RELEASE_OVERDUE")
    ).toMatchObject({ amount: 650, count: 2 });
  });

  it("PAID_ORDER_NOT_IN_LEDGER: an order paid online with no sale in the ledger", async () => {
    const shop = await makeShop();
    const missing = await makeOrder(shop, { orderNumber: "ORD-NO-LEDGER" }, 900); // paid, but recordSale never ran
    await makeOrder(shop, { orderStatus: "cancelled" }, 100); // cancelled: nothing is owed
    await makeOrder(shop, { paymentStatus: "pending" }, 100); // not paid

    let view = await finance(shop);
    expect(view.wallet).toBeNull();
    expect(codes(view)).toEqual(["PAID_ORDER_NOT_IN_LEDGER"]);
    expect(warningOf(view, "PAID_ORDER_NOT_IN_LEDGER")).toMatchObject({
      amount: 900,
      count: 1,
      items: [expect.objectContaining({ id: String(missing), label: "ORD-NO-LEDGER" })],
    });

    // Once the sale is recorded, the warning goes.
    await LedgerService.recordSale({
      orderId: String(missing),
      items: [{ shopId: shop.id, vendorEarnings: 900, commission: 50 }],
    });
    view = await finance(shop);
    expect(codes(view)).toEqual([]);
  });

  it("REJECTED_PAYOUT_NOT_RESTORED: a payout that ended unpaid with its debit never given back", async () => {
    const shop = await makeShop();
    await sell(shop, 1000);
    await release(shop);
    // Rejected while still REQUESTED: marked failed, but the debit made at request time stays.
    const stuck = await requestPayout(shop, 100);
    await setPayoutStatus(stuck, "FAILED", { failureReason: "Wrong amount" });

    const view = await finance(shop);
    expect(view.wallet).toMatchObject({ withdrawableBalance: 900 });
    // The wallet and the ledger agree with each other: the money is missing from both.
    expect(view.reconciliation!.matches).toBe(true);
    expect(codes(view)).toEqual(["REJECTED_PAYOUT_NOT_RESTORED"]);
    expect(warningOf(view, "REJECTED_PAYOUT_NOT_RESTORED")).toMatchObject({
      amount: 100,
      count: 1,
      items: [
        expect.objectContaining({
          id: String(stuck),
          amount: 100,
          note: "Reason given: Wrong amount",
        }),
      ],
    });
    expect(view.payouts.items[0].ledger).toEqual({
      debited: true,
      debitStatus: "PENDING",
      reversed: false,
    });

    // A failed payout that was never debited is not a problem.
    await db.collection("payouts").insertOne({
      _id: oid(),
      shopId: shop._id,
      amount: 50,
      idempotencyKey: String(oid()),
      status: "CANCELLED",
      isExitSettlement: false,
      orderIds: [],
      createdAt: new Date(),
    });
    expect(warningOf(await finance(shop), "REJECTED_PAYOUT_NOT_RESTORED")).toMatchObject({
      amount: 100,
      count: 1,
    });
  });

  it("EXIT_SETTLEMENT_STUCK: a final settlement that was never debited, on a closed wallet", async () => {
    const shop = await makeShop();
    await sell(shop, 800);
    await release(shop);
    // What a vendor's exit leaves behind: a settlement payout with no ledger debit, and a closed wallet.
    const settlement = oid();
    await db.collection("payouts").insertOne({
      _id: settlement,
      shopId: shop._id,
      amount: 800,
      idempotencyKey: String(settlement),
      status: "REQUESTED",
      isExitSettlement: true,
      orderIds: [],
      createdAt: new Date(),
    });
    await db.collection("wallets").updateOne({ shopId: shop._id }, { $set: { status: "CLOSED" } });

    const view = await finance(shop);
    expect(view.wallet).toMatchObject({ status: "CLOSED", withdrawableBalance: 800 });
    expect(codes(view)).toEqual(["EXIT_SETTLEMENT_STUCK"]);
    expect(warningOf(view, "EXIT_SETTLEMENT_STUCK")).toMatchObject({
      amount: 800,
      count: 1,
      details: { walletStatus: "CLOSED", walletWithdrawable: 800 },
    });
    expect(view.payouts.items[0]).toMatchObject({
      isExitSettlement: true,
      ledger: { debited: false },
    });

    // An ordinary request in progress, debited as usual, is not flagged.
    const other = await makeShop();
    await sell(other, 800);
    await release(other);
    await requestPayout(other, 800);
    expect(codes(await finance(other))).toEqual([]);
  });

  it("only ever looks at the vendor asked for", async () => {
    const quiet = await makeShop();
    const noisy = await makeShop();
    await makeOrder(noisy, { orderNumber: "ORD-NOISY" }, 900); // paid, missing from the ledger
    await sell(noisy, 500, { orderStatus: "cancelled" });
    await requestPayout(noisy, 0.01).catch(() => {}); // refused (no balance); leaves a payout record behind

    const view = await finance(quiet);
    expect(view).toMatchObject({ wallet: null, warnings: [], scan: { ordersTotal: 0 } });
    expect(view.payouts.total).toBe(0);
    expect(view.ledger.total).toBe(0);
    expect(JSON.stringify(view)).not.toContain("ORD-NOISY");
  });
});

describe("GET /api/admin/vendors/:id/finance", () => {
  it("is for admins only", async () => {
    const shop = await makeShop();
    const refusedFor = [
      null, // signed out
      { user: { id: String(oid()), role: "user" } },
      { user: { id: String(shop.ownerId), role: "shop_owner", shopId: shop.id } }, // even the vendor themself
    ];
    for (const session of refusedFor) {
      auth.session = session;
      const res = await get(shop.id);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Unauthorized" });
    }

    asAdmin();
    const res = await get(shop.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      finance: { shop: { id: shop.id }, wallet: null },
    });
  });

  it("answers 404 for a shop that does not exist, or an id that is not one", async () => {
    asAdmin();
    expect(await get(String(oid()))).toMatchObject({
      status: 404,
      body: { message: "Shop not found" },
    });
    expect((await get("not-an-id")).status).toBe(404);
  });

  it("pages the ledger and the audit log", async () => {
    asAdmin();
    const shop = await makeShop();
    for (let i = 0; i < 25; i++) await sell(shop, 10 + i);
    for (let i = 0; i < 12; i++) {
      await db.collection("auditlogs").insertOne({
        action: "WALLET_FROZEN",
        performedBy: String(admin._id),
        targetEntity: "Wallet",
        shopId: shop._id,
        reason: `Reason ${i}`,
        createdAt: new Date(Date.now() - i * 1000),
      });
    }

    const { finance: first } = (await get(shop.id)).body;
    expect(first.ledger).toMatchObject({ total: 25, page: 1, pages: 2, limit: 20 });
    expect(first.ledger.items).toHaveLength(20);
    expect(first.audit).toMatchObject({ total: 12, page: 1, pages: 1 });

    const { finance: paged } = (
      await get(shop.id, { ledgerPage: 3, ledgerLimit: 10, auditPage: 2, auditLimit: 5 })
    ).body;
    expect(paged.ledger).toMatchObject({ total: 25, page: 3, pages: 3, limit: 10 });
    expect(paged.ledger.items).toHaveLength(5);
    expect(paged.audit).toMatchObject({ total: 12, page: 2, pages: 3, limit: 5 });
    expect(paged.audit.items.map((row: any) => row.reason)).toEqual([
      "Reason 5",
      "Reason 6",
      "Reason 7",
      "Reason 8",
      "Reason 9",
    ]); // newest first
    // The balances and warnings are for the whole vendor, whatever page is asked for.
    expect(paged.wallet).toEqual(first.wallet);

    expect((await get(shop.id, { ledgerLimit: 100000, auditLimit: 0 })).body.finance).toMatchObject(
      { ledger: { limit: 100 }, audit: { limit: 20 } }
    );
  });

  it("names who did what in the audit log, and passes on only harmless details", async () => {
    asAdmin();
    const shop = await makeShop();
    await db.collection("auditlogs").insertMany([
      {
        action: "PAYOUT_INITIATED",
        performedBy: String(admin._id),
        targetEntity: "Payout",
        targetId: "p1",
        shopId: shop._id,
        reason: "Payout initiated",
        before: { withdrawableBalance: 1000, internal: "x" },
        after: { withdrawableBalance: 400 },
        metadata: { amount: 600, secretNote: "do not show" },
        createdAt: new Date(),
      },
      {
        action: "CRON_STYLE",
        performedBy: "SYSTEM",
        targetEntity: "Wallet",
        shopId: shop._id,
        createdAt: new Date(Date.now() - 1000),
      },
    ]);

    const rows = (await get(shop.id)).body.finance.audit.items;
    expect(rows[0]).toMatchObject({
      action: "PAYOUT_INITIATED",
      targetId: "p1",
      reason: "Payout initiated",
      performedBy: { id: String(admin._id), name: "Priya Admin", role: "admin" },
      details: {
        amount: 600,
        "before.withdrawableBalance": 1000,
        "after.withdrawableBalance": 400,
      },
    });
    expect(rows[1].performedBy).toEqual({ id: null, name: "SYSTEM", role: null });
    expect(JSON.stringify(rows)).not.toContain("do not show");
    expect(JSON.stringify(rows)).not.toContain("internal");
  });

  it("never contains a full account number or UPI id, wherever it was stored or typed", async () => {
    asAdmin();
    const shop = await makeShop();
    const OLD_ACCOUNT = "998877665544"; // an earlier account, kept unmasked on an old payout
    await sell(shop, 1000);
    await release(shop);
    // Free text and old records that carry the numbers in full.
    const payout = await requestPayout(shop, 200, {
      notes: `Please pay to ${ACCOUNT_NUMBER}`,
      bankAccountNumber: OLD_ACCOUNT,
    });
    await setPayoutStatus(payout, "FAILED", {
      failureReason: `Account ${ACCOUNT_NUMBER} rejected; UPI ${UPI_ID} also failed`,
    });
    await db.collection("ledgerentries").insertOne({
      transactionId: "manual",
      accountId: (await db.collection("wallets").findOne({ shopId: shop._id }))!._id,
      shopId: shop._id,
      amount: 0,
      type: "ADJUSTMENT",
      status: "CLEARED",
      description: `Note: transfer to ${ACCOUNT_NUMBER}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection("auditlogs").insertOne({
      action: "PAYOUT_REJECTED",
      performedBy: String(admin._id),
      targetEntity: "Payout",
      shopId: shop._id,
      reason: `Sent to ${ACCOUNT_NUMBER} by mistake`,
      before: { bankDetails: { accountNumber: ACCOUNT_NUMBER } },
      after: { accountNumber: ACCOUNT_NUMBER },
      metadata: { accountNumber: ACCOUNT_NUMBER, upiId: UPI_ID, amount: 200 },
      createdAt: new Date(),
    });

    const queries: Array<Record<string, number>> = [
      {},
      { ledgerPage: 1, ledgerLimit: 100, auditLimit: 100 },
    ];
    for (const query of queries) {
      const res = await get(shop.id, query);
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(ACCOUNT_NUMBER);
      expect(text).not.toContain(OLD_ACCOUNT);
      expect(text).not.toContain(UPI_ID);
      // No other long run of digits either (database ids, which are hex, set aside).
      expect(text.replace(/[0-9a-f]{24}/g, "")).not.toMatch(/\d{9,18}/);

      const view = res.body.finance;
      expect(view.bankDetails).toEqual({
        accountHolderName: "Asha Devi",
        bankName: "HDFC Bank",
        accountNumber: "••••9012",
        ifscCode: "HDFC0001234",
        swiftCode: null,
        upiId: "as••••@okhdfc",
        isComplete: true,
      });
      expect(view.payouts.items[0]).toMatchObject({
        notes: "Please pay to ••••9012",
        bank: { accountNumber: "••••5544" },
        bankMatchesCurrent: false,
      });
      expect(view.payouts.items[0].failureReason).toBe(
        "Account ••••9012 rejected; UPI as••••@okhdfc also failed"
      );
      expect(view.audit.items[0]).toMatchObject({
        reason: "Sent to ••••9012 by mistake",
        details: { amount: 200 },
      });
    }
  });

  it("changes nothing: no wallet is created, and no document is touched", async () => {
    asAdmin();
    const collections = [
      "wallets",
      "ledgerentries",
      "payouts",
      "auditlogs",
      "orders",
      "shops",
      "users",
    ];
    const snapshot = async () =>
      Object.fromEntries(
        await Promise.all(
          collections.map(async (name) => [
            name,
            await db.collection(name).find({}).sort({ _id: 1 }).toArray(),
          ])
        )
      );

    const withMoney = await makeShop();
    await sell(withMoney, 1000, { orderStatus: "cancelled" });
    await release(withMoney);
    const payout = await requestPayout(withMoney, 300);
    await setPayoutStatus(payout, "FAILED");
    const withoutWallet = await makeShop();
    await makeOrder(withoutWallet, { paymentMethod: "cod", orderStatus: "delivered" });

    const before = await snapshot();
    for (const shop of [withMoney, withoutWallet]) {
      expect((await get(shop.id)).status).toBe(200);
      expect((await get(shop.id, { ledgerPage: 2, auditPage: 2 })).status).toBe(200);
    }
    expect(await snapshot()).toEqual(before);
    expect(await db.collection("wallets").countDocuments({ shopId: withoutWallet._id })).toBe(0);
  });
});

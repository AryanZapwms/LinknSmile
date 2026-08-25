import { Product } from "@/lib/models/product";
import { PlatformSettings } from "@/lib/models/platform-settings";

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface CartItemInput {
  product: string;
  quantity: number;
  selectedSize?: { size: string; quantity: number } | null;
}

export interface ProcessedItem {
  product: string;
  name: string;
  quantity: number;
  price: number;
  selectedSize?: { size: string; unit: string; quantity: number; price: number; discountPrice?: number } | undefined;
  shopId: any;
  shopName: string;
  platformCommission: number;
  vendorEarnings: number;
  commissionRate: number;
  // Only set when a vendor coupon discounted this item — see lib/coupon-pricing.ts.
  discountAmount?: number;
}

export interface AppliedCoupon {
  code: string;
  shopId: string;
  discountAmount: number;
}

export interface VendorPayout {
  shopId: any;
  shopName: string;
  amount: number;
  items: { productId: string; productName: string; quantity: number; price: number; earnings: number }[];
}

export interface PricingResult {
  processedItems: ProcessedItem[];
  vendorPayouts: Record<string, VendorPayout>;
  // Final chargeable amount: item subtotal, minus any coupon discount,
  // plus tax — see the tax step at the end of computeOrderPricing.
  totalAmount: number;
  // Only set when a coupon was requested and successfully applied.
  appliedCoupon?: AppliedCoupon;
  // Snapshot of PlatformSettings.taxRatePercent at computation time, and
  // the tax amount actually charged (0 for deployments with no tax, e.g.
  // India today) — always present, unlike appliedCoupon which is genuinely
  // optional. Never trust a client-sent value for either; both are
  // recomputed server-side on every call, same as everything else here.
  taxRatePercent: number;
  taxAmount: number;
}

export interface PricingOptions {
  // Vendor-scoped coupon code, if the caller wants one applied. Omitting
  // this (or leaving it undefined) is the only way to guarantee
  // byte-identical output to before coupons existed.
  couponCode?: string;
  // Needed to enforce a coupon's perUserLimit. Optional because some
  // callers (e.g. a guest-cart preview) may not have a user yet.
  userId?: string;
}

export async function computeOrderPricing(
  items: CartItemInput[],
  options?: PricingOptions
): Promise<PricingResult> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingError("No items provided", 400);
  }

  const processedItems: ProcessedItem[] = [];
  const vendorPayouts: Record<string, VendorPayout> = {};
  let totalAmount = 0;

  for (const item of items) {
    if (!item.product || !item.quantity || item.quantity <= 0) {
      throw new PricingError("Invalid item in cart", 400);
    }

    const product = (await Product.findById(item.product)
      .populate("shopId", "shopName commissionRate")
      .lean()) as any;

    if (!product) {
      throw new PricingError(`Product not found`, 404);
    }

    // Hidden by the vendor-subscription sweep — treat as unpurchasable,
    // same as "not found", so a stale cart/link can't be used to buy
    // around the storefront hide.
    if (product.hiddenBySubscription) {
      throw new PricingError(`"${product.name}" is no longer available`, 404);
    }

    const dbShopId = product.shopId?._id || product.shopId;
    if (!dbShopId) {
      throw new PricingError(`Product "${product.name}" is missing a valid vendor assignment.`, 400);
    }

    let price: number;
    let sizeSnapshot: ProcessedItem["selectedSize"];

    if (item.selectedSize) {
      const sizeDoc = (product.sizes || []).find(
        (s: any) => s.size === item.selectedSize!.size && s.quantity === item.selectedSize!.quantity
      );
      if (!sizeDoc) {
        throw new PricingError(`Selected size not available for "${product.name}"`, 400);
      }
      price = sizeDoc.discountPrice ?? sizeDoc.price;
      sizeSnapshot = {
        size: sizeDoc.size,
        unit: sizeDoc.unit,
        quantity: sizeDoc.quantity,
        price: sizeDoc.price,
        discountPrice: sizeDoc.discountPrice,
      };
    } else {
      price = product.discountPrice ?? product.price;
    }

    if (typeof price !== "number" || price < 0) {
      throw new PricingError(`Invalid price for "${product.name}"`, 400);
    }

    const quantity = Math.floor(item.quantity);
    const shopId = dbShopId.toString();
    const shopName = product.shopId?.shopName || "Linknsmile Platform";
    const commissionRate = product.shopId?.commissionRate ?? 10;

    const itemTotal = price * quantity;
    const platformCommission = (itemTotal * commissionRate) / 100;
    const vendorEarnings = itemTotal - platformCommission;

    totalAmount += itemTotal;

    processedItems.push({
      product: item.product,
      name: product.name,
      quantity,
      price,
      selectedSize: sizeSnapshot,
      shopId: dbShopId,
      shopName,
      platformCommission,
      vendorEarnings,
      commissionRate,
    });

    if (!vendorPayouts[shopId]) {
      vendorPayouts[shopId] = { shopId: dbShopId, shopName, amount: 0, items: [] };
    }
    vendorPayouts[shopId].amount += vendorEarnings;
    vendorPayouts[shopId].items.push({
      productId: item.product,
      productName: product.name,
      quantity,
      price,
      earnings: vendorEarnings,
    });
  }

  // Every existing call site (no couponCode) took this same path before tax
  // existed — the per-item loop above is still byte-for-byte unchanged.
  let preTaxResult: { processedItems: ProcessedItem[]; vendorPayouts: Record<string, VendorPayout>; totalAmount: number; appliedCoupon?: AppliedCoupon };
  if (!options?.couponCode) {
    preTaxResult = { processedItems, vendorPayouts, totalAmount };
  } else {
    const { validateAndApplyCoupon } = await import("@/lib/coupon-pricing");
    preTaxResult = await validateAndApplyCoupon({
      processedItems,
      vendorPayouts,
      totalAmount,
      couponCode: options.couponCode,
      userId: options.userId,
    });
  }

  // Tax step — additive on top of the (possibly coupon-discounted)
  // subtotal, applied uniformly regardless of which branch above ran.
  // Does NOT touch processedItems/vendorPayouts, so vendor commission and
  // payout math stays computed on the pre-tax amount, exactly as before
  // this existed — confirmed money model, see PROJECT_SOURCE_OF_TRUTH.md
  // §4.17. Rate is per-deployment (separate DB per country, see §2), so
  // there's no per-item/per-vendor tax-rate concept, just one settings doc.
  const settings = await PlatformSettings.findOne().lean<{ taxRatePercent?: number }>();
  const taxRatePercent = settings?.taxRatePercent ?? 0;
  const taxAmount = Math.round((preTaxResult.totalAmount * taxRatePercent) / 100 * 100) / 100;
  const grandTotal = Math.round((preTaxResult.totalAmount + taxAmount) * 100) / 100;

  return {
    ...preTaxResult,
    totalAmount: grandTotal,
    taxRatePercent,
    taxAmount,
  };
}
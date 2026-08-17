import { Product } from "@/lib/models/product";

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface CartItemInput {
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
  totalAmount: number;
}

export async function computeOrderPricing(items: CartItemInput[]): Promise<PricingResult> {
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

  return { processedItems, vendorPayouts, totalAmount };
}
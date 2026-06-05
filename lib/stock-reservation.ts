// lib/stock-reservation.ts
// Uses atomic MongoDB operations to reserve and release stock.
// This prevents overselling without needing a separate reservation collection.

import { Product } from "@/lib/models/product";

interface StockItem {
  productId: string;
  quantity: number;
  selectedSize?: { size: string; quantity: number; unit?: string } | null;
}

/**
 * Atomically decrements stock for all items.
 * Returns { success: true } or { success: false, failedProduct: string }
 * Rolls back all decrements if any item fails.
 */
export async function reserveStock(
  items: StockItem[]
): Promise<{ success: boolean; failedProduct?: string }> {
  const reserved: StockItem[] = [];

  for (const item of items) {
    let result;

    if (item.selectedSize) {
      // Size-specific stock — use arrayFilters for atomic update
      result = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "sizes.size": item.selectedSize.size,
          "sizes.quantity": item.selectedSize.quantity,
          "sizes.stock": { $gte: item.quantity }, // only update if enough stock
        },
        {
          $inc: { "sizes.$.stock": -item.quantity },
        },
        { new: true }
      );
    } else {
      // General stock
      result = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity }, // only update if enough stock
        },
        {
          $inc: { stock: -item.quantity },
        },
        { new: true }
      );
    }

    if (!result) {
      // Stock insufficient — roll back everything reserved so far
      await releaseStock(reserved);
      const product = await Product.findById(item.productId).select("name").lean() as any;
      return {
        success: false,
        failedProduct: product?.name ?? item.productId,
      };
    }

    reserved.push(item);
  }

  return { success: true };
}

/**
 * Releases previously reserved stock (used on payment failure or cancellation).
 */
export async function releaseStock(items: StockItem[]): Promise<void> {
  for (const item of items) {
    if (item.selectedSize) {
      await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "sizes.size": item.selectedSize.size,
          "sizes.quantity": item.selectedSize.quantity,
        },
        { $inc: { "sizes.$.stock": item.quantity } }
      );
    } else {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }
  }
}
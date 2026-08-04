import { Product } from "@/lib/models/product";
import type { ProcessedItem } from "@/lib/pricing";

export interface StockDecrementResult {
  product: string;
  ok: boolean;
}

export async function safeDecrementStock(items: ProcessedItem[]): Promise<StockDecrementResult[]> {
  const results: StockDecrementResult[] = [];

  for (const item of items) {
    if (item.selectedSize) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          sizes: {
            $elemMatch: {
              size: item.selectedSize.size,
              quantity: item.selectedSize.quantity,
              stock: { $gte: item.quantity },
            },
          },
        },
        { $inc: { "sizes.$[elem].stock": -item.quantity } },
        {
          arrayFilters: [
            { "elem.size": item.selectedSize.size, "elem.quantity": item.selectedSize.quantity },
          ],
        }
      );
      results.push({ product: item.product, ok: !!updated });
    } else {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      results.push({ product: item.product, ok: !!updated });
    }
  }

  return results;
}
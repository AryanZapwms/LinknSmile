// app/api/cart/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Cart } from "@/lib/models/cart";
import { Product } from "@/lib/models/product";
import { getAuthUser } from "@/lib/get-auth-user";

// Web session cookie or mobile Bearer access token (lib/get-auth-user.ts).
// The old HS256 Bearer path (tokens from the unused /api/auth/login,
// signed with the raw NEXTAUTH_SECRET) is no longer accepted.
async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    return (await getAuthUser(req))?.id ?? null;
  } catch (e) {
    console.warn("⚠️ cart auth failed:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// GET /api/cart
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const cart = await Cart.findOne({ userId }).lean() as any;

    return withCORS(
      NextResponse.json({
        items: cart?.items || [],
        totalPrice: 0,
        cart: cart || { items: [], totalPrice: 0 },
      })
    );
  } catch (error) {
    console.error("Cart GET Error:", error);
    return withCORS(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}

// ─────────────────────────────────────────────
// POST /api/cart
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const { items } = await req.json();
    await connectDB();

    // Price and Stock Revalidation
    const validatedItems = await Promise.all(
      items.map(async (item: any) => {
        const product = await Product.findById(item.productId).populate("shopId");
        if (!product || product.hiddenBySubscription) return null;

        // Validate size if applicable
        let selectedSize = null;
        if (item.selectedSize) {
          selectedSize = product.sizes.find(
            (s: any) =>
              s.size === item.selectedSize.size && s.quantity === item.selectedSize.quantity
          );
        }

        const price = selectedSize ? selectedSize.price : product.price;
        const discountPrice = selectedSize ? selectedSize.discountPrice : product.discountPrice;
        const stock = selectedSize ? selectedSize.stock : product.stock;

        const platformShopId = "699942a5a2b407e83b6d9ea8";
        const shopId = product.shopId?._id || product.shopId || platformShopId;
        const shopName = product.shopId?.shopName || "linknsmile Platform";
        const commissionRate = product.shopId?.commissionRate || 10;

        if (!product.shopId) {
          console.warn(
            `Product ${item.productId} is missing shopId. Falling back to platform shop ID: ${platformShopId}`
          );
        }

        return {
          ...item,
          price,
          discountPrice,
          stock,
          shopId,
          shopName,
          commissionRate,
        };
      })
    );

    const filteredItems = validatedItems.filter((item) => item !== null);

    const cart = await Cart.findOneAndUpdate(
      { userId },
      {
        items: filteredItems,
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    );

    return withCORS(NextResponse.json({ cart }));
  } catch (error) {
    console.error("Cart POST Error:", error);
    return withCORS(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}

// ─────────────────────────────────────────────
// DELETE /api/cart
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    await Cart.findOneAndUpdate({ userId }, { items: [], $inc: { version: 1 } }, { upsert: true });

    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("Cart DELETE Error:", error);

    return withCORS(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}


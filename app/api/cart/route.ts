// app/api/cart/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import jwt from "jsonwebtoken"




// // Temporary — add at top of GET handler
// const authHeader = req.headers.get("authorization")
// const token = authHeader?.substring(7)
// if (token) {
//   // Decode WITHOUT verifying to see what's inside
//   const decoded = JSON.parse(
//     Buffer.from(token.split('.')[1], 'base64').toString()
//   )
//   console.log("📦 Token payload:", decoded)
//   console.log("🔑 Token issued at:", new Date(decoded.iat * 1000))
//   console.log("⏰ Token expires at:", new Date(decoded.exp * 1000))
// }



// ─────────────────────────────────────────────
// Helper: resolve user ID from either auth method
// Supports:
//   1. NextAuth cookie session (web app)
//   2. JWT Bearer token (mobile app)
// ─────────────────────────────────────────────
async function getUserId(req: NextRequest): Promise<string | null> {
  // 1. Try NextAuth session first (web)
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      console.log("✅ Auth via NextAuth session, userId:", session.user.id)
      return session.user.id
    }
  } catch (e) {
    console.warn("⚠️ getServerSession failed:", e)
  }

  // 2. Try Bearer token (mobile)
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
      if (!secret) {
        console.error("❌ No JWT_SECRET or NEXTAUTH_SECRET set in env")
        return null
      }
      const decoded = jwt.verify(token, secret) as { id: string }
      if (decoded?.id) {
        console.log("✅ Auth via Bearer token, userId:", decoded.id)
        return decoded.id
      }
    } catch (e) {
      console.error("❌ JWT verification failed:", e)
      return null
    }
  }

  console.warn("⚠️ No valid auth found (no session, no valid Bearer token)")
  return null
}

// ─────────────────────────────────────────────
// GET /api/cart
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {

    return withCORS(new NextResponse(null))
  }

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    await connectDB()
    const cart = await Cart.findOne({ userId }).lean()

    return withCORS(NextResponse.json({ 
      items: cart?.items || [],
      totalPrice: 0,
      cart: cart || { items: [], totalPrice: 0 } 
    }))
  } catch (error) {
    console.error("Cart GET Error:", error)
    return withCORS(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }))
  }
}

// ─────────────────────────────────────────────
// POST /api/cart
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null))
  }

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    const { items } = await req.json()
    await connectDB()

    // Price and Stock Revalidation
    const validatedItems = await Promise.all(
      items.map(async (item: any) => {
        const product = await Product.findById(item.productId).populate("shopId")
        if (!product) return null

        // Validate size if applicable
        let selectedSize = null
        if (item.selectedSize) {
          selectedSize = product.sizes.find(
            (s: any) =>
              s.size === item.selectedSize.size &&
              s.quantity === item.selectedSize.quantity
          )
        }

        const price = selectedSize ? selectedSize.price : product.price
        const discountPrice = selectedSize ? selectedSize.discountPrice : product.discountPrice
        const stock = selectedSize ? selectedSize.stock : product.stock

        const platformShopId = "699942a5a2b407e83b6d9ea8"
        const shopId = product.shopId?._id || product.shopId || platformShopId
        const shopName = product.shopId?.shopName || "LinkAndSmile Platform"
        const commissionRate = product.shopId?.commissionRate || 10

        if (!product.shopId) {
          console.warn(
            `Product ${item.productId} is missing shopId. Falling back to platform shop ID: ${platformShopId}`
          )
        }

        return {
          ...item,
          price,
          discountPrice,
          stock,
          shopId,
          shopName,
          commissionRate,
        }
      })
    )

    const filteredItems = validatedItems.filter((item) => item !== null)

    const cart = await Cart.findOneAndUpdate(
      { userId },
      {
        items: filteredItems,
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    )

    return withCORS(NextResponse.json({ cart }))
  } catch (error) {
    console.error("Cart POST Error:", error)
    return withCORS(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }))
  }
}



// ─────────────────────────────────────────────
// DELETE /api/cart
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null))
  }

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return withCORS(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    }

    await connectDB()

    await Cart.findOneAndUpdate(
      { userId },
      { items: [], $inc: { version: 1 } },
      { upsert: true }
    )

    return withCORS(NextResponse.json({ success: true }))
  } catch (error) {
    console.error("Cart DELETE Error:", error)

    return withCORS(
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    )
  }
}

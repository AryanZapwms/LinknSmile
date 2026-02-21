import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const cart = await Cart.findOne({ userId: session.user.id }).lean()

    return NextResponse.json({ cart: cart || { items: [], totalPrice: 0 } })
  } catch (error) {
    console.error("Cart GET Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
            (s: any) => s.size === item.selectedSize.size && s.quantity === item.selectedSize.quantity
          )
        }

        const price = selectedSize ? selectedSize.price : product.price
        const discountPrice = selectedSize ? selectedSize.discountPrice : product.discountPrice
        const stock = selectedSize ? selectedSize.stock : product.stock

        const platformShopId = "699942a5a2b407e83b6d9ea8";
        const shopId = product.shopId?._id || product.shopId || platformShopId;
        const shopName = product.shopId?.shopName || "LinkAndSmile Platform";
        const commissionRate = product.shopId?.commissionRate || 10;

        if (!product.shopId) {
          console.warn(`Product ${item.productId} is missing shopId. Falling back to platform shop ID: ${platformShopId}`);
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
      { userId: session.user.id },
      { 
        items: filteredItems,
        $inc: { version: 1 } 
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ cart })
  } catch (error) {
    console.error("Cart POST Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Clear cart items in DB — do not delete the document so version tracking is preserved
    await Cart.findOneAndUpdate(
      { userId: session.user.id },
      { items: [], $inc: { version: 1 } },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cart DELETE Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

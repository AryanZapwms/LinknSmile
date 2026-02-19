import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address?.street || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      pincode: user.address?.zipCode || "",
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { name, phone, address, city, state, pincode } = body

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        name,
        phone,
        address: {
          street: address,
          city,
          state,
          zipCode: pincode,
          country: "India",
        },
      },
      { new: true },
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address?.street || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      pincode: user.address?.zipCode || "",
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

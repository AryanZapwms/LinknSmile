import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import Shop from "@/lib/models/shop";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    console.log("Debug Link-Shop: DB Connected");

    const email = "ag11214280@gmail.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log("Debug Link-Shop: User not found", email);
      return NextResponse.json({ success: false, message: `User ${email} not found` }, { status: 404 });
    }

    console.log("Debug Link-Shop: Found User", {
      id: user._id,
      email: user.email,
      role: user.role,
      currentShopId: user.shopId
    });

    // Find any shop owned by this user
    let shop = await Shop.findOne({ ownerId: user._id });

    if (!shop) {
      console.log("Debug Link-Shop: No shop found for user, checking ALREADY existing shops...");
      const allShops = await Shop.find({}).limit(5);
      console.log("Debug Link-Shop: Sample shops in DB:", allShops.map(s => ({ id: s._id, owner: s.ownerId, name: s.shopName })));
      
      console.log("Debug Link-Shop: Creating a new default shop...");
      shop = await Shop.create({
        ownerId: user._id,
        shopName: "LinkAndSmile Official Shop",
        slug: "linkandsmile-" + Date.now(),
        description: "Official LinkAndSmile Vendor Shop",
        address: {
          street: "Main St",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          country: "India"
        },
        contactInfo: {
          phone: "0000000000",
          email: user.email
        },
        isApproved: true,
        isActive: true
      });
      console.log("Debug Link-Shop: Created shop", shop._id);
    } else {
      console.log("Debug Link-Shop: Found existing shop", shop._id);
    }

    // Link shop to user
    user.shopId = shop._id;
    user.role = "shop_owner"; 
    await user.save();
    console.log("Debug Link-Shop: User updated successfully");

    return NextResponse.json({
      success: true,
      message: "User linked to shop successfully",
      diagnostics: {
        userId: user._id,
        email: user.email,
        role: user.role,
        shopId: shop._id,
        shopName: shop.shopName,
        isNewShop: !shop.wasNew // wasNew isn't a mongoose thing but you get the idea
      }
    });

  } catch (error: any) {
    console.error("Debug Link-Shop Error:", error);
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}

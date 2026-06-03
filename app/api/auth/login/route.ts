import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { loginLimiter } from "@/lib/rate-limit";

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = loginLimiter(ip);

    if (!success) {
      return Response.json(
        { error: "Too many requests. Please wait a minute before trying again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    await connectDB();
    const userDoc = await User.findOne({ email: email.trim().toLowerCase() });

    if (!userDoc) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (!userDoc.isVerified) {
      return NextResponse.json(
        { message: "Please verify your email before logging in" },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, userDoc.password);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const user = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name || "User",
      role: userDoc.role === "shop_owner" ? "vendor" : "customer",
      avatar: userDoc.avatar || null,
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

    const response = NextResponse.json({ token, user }, { status: 200 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } catch (err) {
    console.error("[mobile /api/auth/login]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  if (request.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image || null,
      address: user.address?.street || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      pincode: user.address?.zipCode || "",
    }));
  } catch (error) {
    console.error("Error fetching profile:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 }));
  }
}

export async function PUT(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const body = await req.json();
    const { name, email, phone, address, city, state, pincode, imageBase64 } = body;

    // Prepare update object
    const updateData: any = { name, phone };
    if (email) updateData.email = email;

    // Handle address fields (if provided)
    if (address || city || state || pincode) {
      updateData.address = {
        street: address || "",
        city: city || "",
        state: state || "",
        zipCode: pincode || "",
        country: "India",
      };
    }

    // Handle image upload if base64 is provided
    let imageUrl = null;
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      try {
        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Extract base64 data
        const matches = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `avatar-${Date.now()}-${session.user.email}.${ext}`;
          const filepath = path.join(uploadDir, filename);
          await writeFile(filepath, buffer);
          imageUrl = `/uploads/${filename}`;
          updateData.image = imageUrl;
        }
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        // Continue without image
      }
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image || null,
        address: user.address?.street || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        pincode: user.address?.zipCode || "",
      }
    }));
  } catch (error) {
    console.error("Error updating profile:", error);
    return withCORS(NextResponse.json({ error: "Failed to update profile" }, { status: 500 }));
  }
}
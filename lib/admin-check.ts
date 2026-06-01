import { getServerSession } from "next-auth";
import { User } from "@/lib/models/user";
import { connectDB } from "@/lib/db";

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return false;
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user || user.role !== "admin") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

export async function getAdminUser() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return null;
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user || user.role !== "admin") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return null;
  }
}
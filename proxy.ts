import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: NextRequest) {
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET 
  })

  const path = req.nextUrl.pathname;

  // Check if user is authenticated
  if (!token) {
    // Redirect unauthenticated users from protected routes
    if (
      path.startsWith("/profile") ||
      path.startsWith("/admin") ||
      path.startsWith("/vendor") || // ✅ ADD THIS
      path.startsWith("/checkout")
    ) {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }
  }

  // Admin routes - only admins
  if (path.startsWith("/admin") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // ✅ NEW: Vendor routes - only shop_owners
  if (path.startsWith("/vendor") && token?.role !== "shop_owner") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/profile/:path*", 
    "/admin/:path*", 
    "/vendor/:path*", 
    "/checkout/:path*"
  ],
}
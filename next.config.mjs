/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVED: typescript.ignoreBuildErrors — this was silently hiding type errors in production builds.
  // Fix your TS errors properly. Run: npx tsc --noEmit to see them all.
	eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // REMOVED: unoptimized: true — this disabled all Next.js image optimization (WebP, lazy loading, sizing).
    // Cloudinary images will now be optimized automatically.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "linknsmile.com",
      },
      {
        protocol: "https",
        hostname: "care.linknsmile.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  async headers() {
    return [
      // Security headers on every page and API route
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Disable browser features you don't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Force HTTPS for 1 year
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      // CORS: only allow your own frontend origin, not wildcard.
      // This was previously "Access-Control-Allow-Origin: *" which lets any
      // website call your API as if it were a logged-in user.
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXTAUTH_URL ?? "https://linkn-smile.vercel.app",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          // Required for cookies/sessions to work cross-origin if ever needed
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/serve-files/uploads/:path*",
      },
      {
        source: "/arrivals/:path*",
        destination: "/api/serve-files/arrivals/:path*",
      },
      {
        source: "/blogs/:path*",
        destination: "/api/serve-files/blogs/:path*",
      },
      {
        source: "/carousel/:path*",
        destination: "/api/serve-files/carousel/:path*",
      },
      {
        source: "/fonts/:path*",
        destination: "/api/serve-files/fonts/:path*",
      },
      {
        source: "/shop-by-concern/:path*",
        destination: "/api/serve-files/shop-by-concern/:path*",
      },
    ];
  },
};

export default nextConfig;

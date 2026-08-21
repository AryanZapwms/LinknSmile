import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// i18n Step 8 (2026-08-21) — "without i18n routing" mode, see i18n/request.ts
// for why. Explicit path, not relying on the default resolution order.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Deployment's own image-serving hostnames, comma-separated. Optional —
// defaults to today's two India hostnames, so this is a no-op unless a new
// country deployment sets it. res.cloudinary.com (the CDN, not brand-
// specific) is always allowed regardless.
const imageHostnames = (
  process.env.NEXT_PUBLIC_IMAGE_HOSTNAMES || "linknsmile.com,care.linknsmile.com"
)
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
    eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
  qualities: [75, 90],
    remotePatterns: [
      ...imageHostnames.map((hostname) => ({ protocol: "https", hostname })),
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

export default withSentryConfig(withNextIntl(nextConfig), {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "zap-solutions",

 project: "javascript-nextjs",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: true,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 },
});

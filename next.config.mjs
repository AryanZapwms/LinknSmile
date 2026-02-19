


/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'linknsmile.com',
      },
      {
        protocol: 'https',
        hostname: 'care.linknsmile.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-files/uploads/:path*',
      },
      {
        source: '/arrivals/:path*',
        destination: '/api/serve-files/arrivals/:path*',
      },
      {
        source: '/blogs/:path*',
        destination: '/api/serve-files/blogs/:path*',
      },
      {
        source: '/carousel/:path*',
        destination: '/api/serve-files/carousel/:path*',
      },
      {
        source: '/fonts/:path*',
        destination: '/api/serve-files/fonts/:path*',
      },
      {
        source: '/shop-by-concern/:path*',
        destination: '/api/serve-files/shop-by-concern/:path*',
      },
    ];
  },
}

export default nextConfig
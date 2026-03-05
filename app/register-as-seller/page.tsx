import Link from "next/link"

export default function RegisterAsSellerPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Register as a Seller</h1>
      <p className="text-gray-600 mb-8">
        Join our marketplace and start selling your products to thousands of customers.
      </p>
      <Link
        href="/auth/register-vendor"
        className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors"
      >
        Get Started
      </Link>
    </main>
  )
}
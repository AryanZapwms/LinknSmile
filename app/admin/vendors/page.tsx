"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Eye, Edit, Settings } from "lucide-react"

interface Vendor {
  _id: string
  shopName: string
  ownerId: {
    name: string
    email: string
  }
  isApproved: boolean
  isActive: boolean
  commissionRate: number
  stats: {
    totalRevenue: number
    totalOrders: number
  }
}

export default function VendorsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    
    fetchVendors()
  }, [status, router])

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/admin/vendors")
      if (res.ok) {
        const data = await res.json()
        setVendors(data)
      }
    } catch (error) {
      console.error("Error fetching vendors:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading vendors...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Vendors</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{vendor.shopName}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{vendor.ownerId?.name}</div>
                      <div className="text-xs text-muted-foreground">{vendor.ownerId?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {vendor.isActive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {!vendor.isApproved && (
                        <Badge variant="destructive" className="ml-2">Pending Approval</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">{vendor.commissionRate}%</td>
                    <td className="py-3 px-4">₹{vendor.stats?.totalRevenue.toLocaleString() || 0}</td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/vendors/${vendor._id}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No vendors found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

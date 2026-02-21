"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Store, DollarSign, Package, ShoppingBag } from "lucide-react"

export default function VendorDetailsPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const [vendor, setVendor] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commission, setCommission] = useState("10")
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }

    if (id) {
      fetchVendorDetails()
    }
  }, [id, status])

  const fetchVendorDetails = async () => {
    try {
      setLoading(true)

      const res = await fetch(`/api/admin/vendors/${id}`)
      if (!res.ok) throw new Error("Failed to fetch vendor")

      const data = await res.json()

      // ✅ SAFE STATE ASSIGNMENTS
      setVendor(data?.shop ?? null)
      setProducts(Array.isArray(data?.products) ? data.products : [])
      setOrders(Array.isArray(data?.orders) ? data.orders : [])
      setCommission(data?.shop?.commissionRate?.toString() ?? "10")
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Could not load vendor details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCommission = async () => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: Number(commission) }),
      })

      if (!res.ok) throw new Error("Update failed")

      toast({ title: "Success", description: "Commission rate updated" })
      await fetchVendorDetails()
    } catch (error) {
      toast({
        title: "Error",
        description: "Update failed",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const toggleStatus = async (action: "approve" | "deactivate" | "activate") => {
    try {
      const body =
        action === "approve"
          ? { isApproved: true, isActive: true }
          : { isActive: action === "activate" }

      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Status update failed")

      toast({
        title: "Success",
        description: `Vendor ${action}d successfully`,
      })

      await fetchVendorDetails()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading vendor details...
      </div>
    )

  if (!vendor)
    return <div className="p-8 text-center">Vendor not found</div>

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="w-8 h-8 text-purple-600" />
            {vendor?.shopName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Owned by {vendor?.ownerId?.name} ({vendor?.ownerId?.email})
          </p>
        </div>

        <div className="flex gap-2">
          {!vendor?.isApproved && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => toggleStatus("approve")}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Store
            </Button>
          )}

          {vendor?.isActive ? (
            <Button
              variant="destructive"
              onClick={() => toggleStatus("deactivate")}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deactivate Store
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => toggleStatus("activate")}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Activate Store
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{vendor?.stats?.totalRevenue?.toLocaleString?.() ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendor?.stats?.totalOrders ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products
            </CardTitle>
            <Package className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {/* ✅ SAFE LENGTH */}
            <div className="text-2xl font-bold">
              {products?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Address</h3>
                <p className="text-sm text-gray-600">
                  {vendor?.address?.street}, {vendor?.address?.city}
                  <br />
                  {vendor?.address?.state} - {vendor?.address?.pincode}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Contact</h3>
                <p className="text-sm text-gray-600">
                  Phone: {vendor?.contactInfo?.phone}
                  <br />
                  Email: {vendor?.contactInfo?.email}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Product Name</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Stock</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products?.length > 0 ? (
                      products.map((p) => (
                        <tr key={p._id} className="border-b">
                          <td className="py-2 font-medium">{p.name}</td>
                          <td className="py-2">₹{p.price}</td>
                          <td className="py-2">{p.stock}</td>
                          <td className="py-2">
                            <Badge
                              variant={p.isActive ? "default" : "secondary"}
                            >
                              {p.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <Button size="sm" variant="ghost" asChild>
                              <a
                                href={`/products/${p._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </a>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-4 text-center text-muted-foreground"
                        >
                          No products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Commission Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 max-w-sm">
                <div className="grid gap-2 w-full">
                  <label
                    htmlFor="commission"
                    className="text-sm font-medium"
                  >
                    Platform Commission (%)
                  </label>
                  <Input
                    id="commission"
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
                <Button onClick={updateCommission} disabled={updating}>
                  {updating ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This percentage will be deducted from each sale made by this vendor.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
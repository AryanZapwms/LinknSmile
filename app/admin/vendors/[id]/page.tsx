"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Store,
  DollarSign,
  Package,
  ShoppingBag,
  CreditCard,
  Building2,
  Globe,
  ShieldCheck,
} from "lucide-react";

export default function VendorDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commission, setCommission] = useState("10");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }

    if (id) {
      fetchVendorDetails();
    }
  }, [id, status]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/vendors/${id}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");

      const data = await res.json();
      console.log("Vendor API response:", data);

      // ✅ SAFE STATE ASSIGNMENTS
      setVendor(data?.shop ?? null);
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setCommission(data?.shop?.commissionRate?.toString() ?? "10");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Could not load vendor details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCommission = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: Number(commission) }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast({ title: "Success", description: "Commission rate updated" });
      await fetchVendorDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Update failed",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const toggleStatus = async (action: "approve" | "deactivate" | "activate") => {
    try {
      const body =
        action === "approve"
          ? { isApproved: true, isActive: true }
          : { isActive: action === "activate" };

      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Status update failed");

      toast({
        title: "Success",
        description: `Vendor ${action}d successfully`,
      });

      await fetchVendorDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (loading)
    return <div className="text-muted-foreground p-8 text-center">Loading vendor details...</div>;

  if (!vendor) return <div className="p-8 text-center">Vendor not found</div>;

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Store className="h-8 w-8 text-purple-600" />
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
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Store
            </Button>
          )}

          {vendor?.isActive ? (
            <Button variant="destructive" onClick={() => toggleStatus("deactivate")}>
              <XCircle className="mr-2 h-4 w-4" />
              Deactivate Store
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => toggleStatus("activate")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate Store
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{vendor?.stats?.totalRevenue?.toLocaleString?.() ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendor?.stats?.totalOrders ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {/* ✅ SAFE LENGTH */}
            <div className="text-2xl font-bold">{products?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Address</h3>
                <p className="text-sm text-gray-600">
                  {vendor?.address?.street}, {vendor?.address?.city}
                  <br />
                  {vendor?.address?.state} - {vendor?.address?.pincode}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Contact</h3>
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
                            <Badge variant={p.isActive ? "default" : "secondary"}>
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
                        <td colSpan={5} className="text-muted-foreground py-4 text-center">
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

        {/* ── Bank Details tab ──────────────────────────────────────────── */}
        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Payout Bank Account</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Sensitive — only visible to admin.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {vendor?.bankDetails?.accountNumber ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Account Holder */}
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Account Holder Name
                    </p>
                    <p className="text-base font-semibold">
                      {vendor.bankDetails.accountHolderName || "—"}
                    </p>
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                      <Building2 className="h-3 w-3" /> Bank Name
                    </p>
                    <p className="text-base font-semibold">{vendor.bankDetails.bankName || "—"}</p>
                  </div>

                  {/* Account Number — masked */}
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                      <CreditCard className="h-3 w-3" /> Account Number
                    </p>
                    <p className="font-mono text-base font-semibold tracking-widest">
                      {vendor.bankDetails.accountNumber
                        ? "•".repeat(Math.max(0, vendor.bankDetails.accountNumber.length - 4)) +
                          vendor.bankDetails.accountNumber.slice(-4)
                        : "—"}
                    </p>
                  </div>

                  {/* IFSC */}
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      IFSC Code
                    </p>
                    <p className="font-mono text-base font-semibold tracking-wider">
                      {vendor.bankDetails.ifscCode || "—"}
                    </p>
                  </div>

                  {/* SWIFT */}
                  {vendor.bankDetails.swiftCode && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                        <Globe className="h-3 w-3" /> SWIFT / BIC Code
                      </p>
                      <p className="font-mono text-base font-semibold tracking-wider">
                        {vendor.bankDetails.swiftCode}
                      </p>
                    </div>
                  )}

                  {/* UPI */}
                  {vendor.bankDetails.upiId && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        UPI ID
                      </p>
                      <p className="text-base font-semibold">{vendor.bankDetails.upiId}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-gray-100 p-3">
                    <CreditCard className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">No bank details on file</p>
                  <p className="text-muted-foreground max-w-xs text-sm">
                    This vendor has not added their bank account information yet. Payouts cannot be
                    processed until this is complete.
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">
                    ⚠ Vendor must add bank details before payout
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security note for admin */}
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <p className="text-xs leading-relaxed text-blue-700">
              <strong>Admin Only:</strong> This bank information is encrypted and stored securely.
              Account numbers are shown partially masked. Only use this data for legitimate payout
              operations and dispute resolution. Do not share or copy these details.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Commission Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex max-w-sm items-end gap-4">
                <div className="grid w-full gap-2">
                  <label htmlFor="commission" className="text-sm font-medium">
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
              <p className="text-muted-foreground mt-2 text-sm">
                This percentage will be deducted from each sale made by this vendor.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionRow {
  shopId: string;
  shopName: string;
  owner: { name: string; email: string };
  subscriptionStatus: "active" | "expired" | "cancelled" | "pending" | "no_subscription";
  accessStatus: "no_subscription" | "active" | "grace_period" | "blocked";
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  isInGracePeriod: boolean;
  isBlocked: boolean;
  lastPaymentAmount: number | null;
  lastPaymentAt: string | null;
}

function StatusBadge({ row }: { row: SubscriptionRow }) {
  if (row.accessStatus === "active") {
    return (
      <Badge variant="default" className="bg-green-600">
        Active
      </Badge>
    );
  }
  if (row.accessStatus === "grace_period") {
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-600">
        Grace period
      </Badge>
    );
  }
  if (row.accessStatus === "blocked" && row.subscriptionStatus === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  return <Badge variant="destructive">Blocked</Badge>;
}

export default function VendorSubscriptionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
    fetchRows();
  }, [status, router]);

  const fetchRows = async () => {
    try {
      const res = await fetch("/api/admin/vendor-subscriptions");
      if (res.ok) setRows(await res.json());
    } catch (error) {
      console.error("Error fetching vendor subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vendor Subscriptions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Shop</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Days remaining/overdue</th>
                  <th className="px-4 py-3">Last Payment</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.shopId} className="hover:bg-muted/50 border-b">
                    <td className="px-4 py-3 font-medium">{row.shopName}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{row.owner?.name}</div>
                      <div className="text-muted-foreground text-xs">{row.owner?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge row={row} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.expiryDate
                        ? new Date(row.expiryDate).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.daysUntilExpiry === null
                        ? "—"
                        : row.daysUntilExpiry >= 0
                          ? `${row.daysUntilExpiry} days left`
                          : `${Math.abs(row.daysUntilExpiry)} days overdue`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.lastPaymentAmount ? `₹${row.lastPaymentAmount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/vendors/${row.shopId}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground py-8 text-center">
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
  );
}

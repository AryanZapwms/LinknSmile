"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, getCurrencySymbol, LOCALE } from "@/lib/currency";

interface SubscriptionRow {
  shopId: string;
  shopName: string;
  owner: { name: string; email: string };
  subscriptionStatus: "active" | "expired" | "cancelled" | "pending" | "no_subscription";
  accessStatus: "no_subscription" | "active" | "grace_period" | "blocked";
  source: "paid" | "comped";
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

function FeeSettingsCard() {
  const [annualFeeAmount, setAnnualFeeAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/vendor-subscription-settings")
      .then((res) => res.json())
      .then((data) => setAnnualFeeAmount(data.annualFeeAmount))
      .catch((error) => console.error("Error fetching subscription settings:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/vendor-subscription-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualFeeAmount }),
      });
      setMessage(res.ok ? "Saved successfully!" : "Error saving fee amount");
      if (res.ok) setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving subscription settings:", error);
      setMessage("Error saving fee amount");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Annual Fee Settings</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="annualFeeAmount">{`Annual Fee (${getCurrencySymbol()})`}</Label>
              <Input
                id="annualFeeAmount"
                type="number"
                min="1"
                value={annualFeeAmount}
                onChange={(e) => setAnnualFeeAmount(Number(e.target.value))}
                className="mt-2 w-40"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {message && (
              <p
                className={`text-sm ${message.includes("successfully") ? "text-green-600" : "text-red-600"}`}
              >
                {message}
              </p>
            )}
          </div>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          Applies to new subscription payments only — existing pending/active subscriptions keep the
          amount they were created with.
        </p>
      </CardContent>
    </Card>
  );
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

      <FeeSettingsCard />

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
                      <div className="flex items-center gap-1.5">
                        <StatusBadge row={row} />
                        {row.source === "comped" && (
                          <Badge variant="outline" className="border-blue-400 text-blue-600">
                            Comp
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.expiryDate
                        ? new Date(row.expiryDate).toLocaleDateString(LOCALE, {
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
                      {row.lastPaymentAmount ? formatCurrency(row.lastPaymentAmount) : "—"}
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

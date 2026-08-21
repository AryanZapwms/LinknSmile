// app/vendor/coupons/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Tag, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/currency";

interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export default function VendorCouponsPage() {
  const t = useTranslations("VendorCouponsPage");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/coupons");
      const data = await res.json();
      if (data.success) setCoupons(data.coupons);
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vendor/coupons/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("deleteSuccess"));
        setCoupons(coupons.filter((c) => c._id !== deleteId));
        setDeleteId(null);
      } else {
        toast.error(data.message || t("deleteFailed"));
      }
    } catch (error) {
      toast.error(t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const formatDiscount = (c: Coupon) =>
    c.discountType === "percentage"
      ? `${c.discountValue}%${c.maxDiscountAmount ? ` (max ${formatCurrency(c.maxDiscountAmount)})` : ""}`
      : formatCurrency(c.discountValue);

  const isExpired = (c: Coupon) => c.validUntil && new Date(c.validUntil) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/vendor/coupons/add">
            <Plus className="me-2 h-4 w-4" />
            {t("newCoupon")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t("noCouponsYet")}</p>
              <Button asChild>
                <Link href="/vendor/coupons/add">
                  <Plus className="me-2 h-4 w-4" />
                  {t("createFirstCoupon")}
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCode")}</TableHead>
                  <TableHead>{t("colDiscount")}</TableHead>
                  <TableHead>{t("colMinOrder")}</TableHead>
                  <TableHead>{t("colUsage")}</TableHead>
                  <TableHead>{t("colValidUntil")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead className="text-end">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon._id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono font-semibold">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        {coupon.code}
                      </div>
                    </TableCell>
                    <TableCell>{formatDiscount(coupon)}</TableCell>
                    <TableCell>
                      {coupon.minOrderValue ? formatCurrency(coupon.minOrderValue) : "—"}
                    </TableCell>
                    <TableCell>
                      {coupon.usageCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                      {coupon.perUserLimit ? (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          {t("perUserSuffix", { limit: coupon.perUserLimit })}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {coupon.validUntil
                        ? new Date(coupon.validUntil).toLocaleDateString()
                        : t("noExpiry")}
                    </TableCell>
                    <TableCell>
                      {isExpired(coupon) ? (
                        <Badge variant="outline" className="border-orange-500 text-orange-500">
                          {t("expired")}
                        </Badge>
                      ) : coupon.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="me-1 h-3 w-3" />
                          {t("active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="me-1 h-3 w-3" />
                          {t("inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/vendor/coupons/edit/${coupon._id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(coupon._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

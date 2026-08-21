"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  BarChart3,
  Upload,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  image?: string;
  stock: number;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  isActive: boolean;
  createdAt: string;
  category?: { name: string };
  company?: { name: string };
}

interface ProductStats {
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
}

export default function VendorProductsPage() {
  const t = useTranslations("VendorProductsPage");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/vendor/products?${params}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/vendor/products/${deleteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t("deleteSuccess"));
        setProducts(products.filter((p) => p._id !== deleteId));
        setDeleteId(null);
      } else {
        toast.error(data.message || t("deleteFailed"));
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleViewStats = async (product: Product) => {
    setSelectedProduct(product);
    setStatsDialogOpen(true);
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/vendor/products/stats`);
      const data = await res.json();
      // Find stats for this product
      const statsForProduct = data.find((s: any) => s._id === product._id);
      setProductStats(statsForProduct || { totalOrders: 0, totalQuantity: 0, totalRevenue: 0 });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error(t("statsLoadFailed"));
      setProductStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="me-1 h-3 w-3" />
            {t("approved")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <Clock className="me-1 h-3 w-3" />
            {t("pending")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="me-1 h-3 w-3" />
            {t("rejected")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/vendor/products/bulk-upload">
              <Upload className="me-2 h-4 w-4" />
              {t("bulkUpload")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/vendor/products/add">
              <Plus className="me-2 h-4 w-4" />
              {t("addProduct")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("filterProducts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-2.5 start-2.5 h-4 w-4" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-8"
                />
              </div>
              <Button type="submit">{t("search")}</Button>
            </form>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus")}</SelectItem>
                <SelectItem value="approved">{t("approved")}</SelectItem>
                <SelectItem value="pending">{t("pending")}</SelectItem>
                <SelectItem value="rejected">{t("rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t("noProductsFound")}</p>
              <Button asChild>
                <Link href="/vendor/products/add">
                  <Plus className="me-2 h-4 w-4" />
                  {t("addFirstProduct")}
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colProduct")}</TableHead>
                  <TableHead>{t("colPrice")}</TableHead>
                  <TableHead>{t("colStock")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colCreated")}</TableHead>
                  <TableHead className="text-center">{t("colOrders")}</TableHead>
                  <TableHead className="text-center">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                            <Package className="text-muted-foreground h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {product.category?.name || t("uncategorized")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrency(product.price)}</p>
                        {product.discountPrice && (
                          <p className="text-muted-foreground text-sm line-through">
                            {formatCurrency(product.discountPrice)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="text-blue-700"
                        variant={product.stock > 0 ? "default" : "destructive"}
                      >
                        {t("stockUnits", { count: product.stock })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(product.approvalStatus)}
                        {product.approvalStatus === "rejected" && product.rejectionReason && (
                          <p className="max-w-xs text-xs text-red-600">
                            {t("reasonLabel", { reason: product.rejectionReason })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm" onClick={() => handleViewStats(product)}>
                        <BarChart3 className="me-1 h-4 w-4" />
                        {t("stats")}
                      </Button>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/vendor/products/edit/${product._id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        {product.approvalStatus !== "approved" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(product._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
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

      {/* Product Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("productPerformance", { name: selectedProduct?.name || "" })}</DialogTitle>
          </DialogHeader>
          {loadingStats ? (
            <div className="flex justify-center py-8">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : productStats ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-2xl font-bold text-blue-700">{productStats.totalOrders}</p>
                  <p className="text-xs text-blue-600">{t("totalOrders")}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-2xl font-bold text-green-700">{productStats.totalQuantity}</p>
                  <p className="text-xs text-green-600">{t("unitsSold")}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(productStats.totalRevenue)}
                  </p>
                  <p className="text-xs text-purple-600">{t("revenueYourEarnings")}</p>
                </div>
              </div>
              <p className="text-muted-foreground text-center text-xs">{t("statsFootnote")}</p>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">{t("noSalesData")}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

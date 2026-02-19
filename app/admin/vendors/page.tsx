'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, CheckCircle, XCircle, Clock, Store } from 'lucide-react';
import { toast } from 'sonner';

interface Shop {
  _id: string;
  shopName: string;
  slug: string;
  isApproved: boolean;
  isActive: boolean;
  commissionRate: number;
  createdAt: string;
  ownerId: {
    name: string;
    email: string;
    phone: string;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
  ratings: {
    average: number;
    count: number;
  };
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [statusFilter]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/vendors?${params}`);
      const data = await res.json();

      if (data.success) {
        setVendors(data.shops);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors();
  };

  const getStatusBadge = (shop: Shop) => {
    if (!shop.isApproved) {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-none capitalize">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    if (!shop.isActive) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-8 m-3">
        <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
        <p className="text-muted-foreground">
          Manage vendor shops and applications
        </p>
      </div>

      {/* Filters */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Filter Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by shop name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card className="m-4">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No vendors found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
             <TableBody>
  {vendors.map((vendor) => (
    <TableRow key={vendor._id}>
      <TableCell>
        <div>
          <p className="font-medium">{vendor.shopName}</p>
          <p className="text-sm text-muted-foreground">/{vendor.slug}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{vendor.ownerId?.name ?? "N/A"}</p>
          <p className="text-sm text-muted-foreground">
            {vendor.ownerId?.email ?? "N/A"}
          </p>
        </div>
      </TableCell>
      <TableCell>{vendor.stats.totalProducts}</TableCell>
      <TableCell>{vendor.stats.totalOrders}</TableCell>
      <TableCell>{vendor.commissionRate}%</TableCell>
      <TableCell>{getStatusBadge(vendor)}</TableCell>
      <TableCell>
        {new Date(vendor.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/vendors/${vendor._id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>

            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

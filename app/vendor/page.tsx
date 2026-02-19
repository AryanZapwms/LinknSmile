'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Stats {
  totalProducts: number;
  pendingApproval: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalOrders: number;
  totalEarnings: number;
  pendingPayouts: number;
}

interface Shop {
  name: string;
  isApproved: boolean;
  isActive: boolean;
  commissionRate: number;
  ratings: {
    average: number;
    count: number;
  };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function VendorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/vendor/stats');
      const data = await res.json();

      if (data.success) {
        setStats(data.stats);
        setShop(data.shop);
        setRecentOrders(data.recentOrders || []);
      } else {
        setError(data.message || 'Failed to load dashboard data.');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError('An unexpected error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !shop || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || 'Failed to load dashboard data.'}</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      shipped: 'default',
      delivered: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {shop.name}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your shop today.
        </p>
      </div>

      {/* Shop Status Alert */}
      {!shop.isApproved && (
        <Alert className="bg-orange-50 border-orange-200">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Shop Pending Approval</AlertTitle>
          <AlertDescription className="text-orange-700">
            Your shop is currently under review. You will be able to add and manage products once your shop is approved by our admin team.
          </AlertDescription>
        </Alert>
      )}

      {!shop.isActive && shop.isApproved && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Shop Inactive</AlertTitle>
          <AlertDescription>
            Your shop is currently inactive. Please contact support for more information.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {stats.approvedProducts} approved
              </span>
              <span className="flex items-center gap-1 text-purple-600">
                <Clock className="h-3 w-3" />
                {stats.pendingApproval} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              After {shop.commissionRate}% commission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.pendingPayouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available to withdraw
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shop Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="flex gap-2 mt-1">
              {shop.isApproved ? (
                <Badge variant="default" className="bg-purple-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
              {shop.isActive ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Commission Rate</p>
            <p className="text-2xl font-bold mt-1">{shop.commissionRate}%</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Shop Rating</p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-2xl font-bold">{shop.ratings.average.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">({shop.ratings.count} reviews)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendor/orders">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">#{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-medium">₹{order.totalAmount.toLocaleString()}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/vendor/orders/${order.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`transition-shadow ${!shop.isApproved ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}`}>
          <Link href={shop.isApproved ? "/vendor/products/add" : "#"} onClick={(e) => !shop.isApproved && e.preventDefault()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Add New Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                List a new product for sale
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className={`transition-shadow ${!shop.isApproved ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}`}>
          <Link href={shop.isApproved ? "/vendor/products" : "#"} onClick={(e) => !shop.isApproved && e.preventDefault()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Manage Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and edit your products
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/vendor/payouts">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Request Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Withdraw your earnings
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
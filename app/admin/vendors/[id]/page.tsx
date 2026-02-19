'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, CheckCircle, XCircle, Store, User, 
  Mail, Phone, MapPin, Calendar, Package, 
  ShoppingCart, DollarSign, AlertCircle, Ban, Play
} from 'lucide-react';

import { toast } from 'sonner';
import Link from 'next/link';

interface Shop {
  _id: string;
  shopName: string;
  slug: string;
  description: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
  gstNumber?: string;
  panNumber?: string;
  commissionRate: number;
  isApproved: boolean;
  isActive: boolean;
  approvalDate?: string;
  rejectionReason?: string;
  createdAt: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
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

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchShop();
  }, [vendorId]);

  const fetchShop = async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`);
      const data = await res.json();

      if (data.success) {
        setShop(data.shop);
      } else {
        toast.error('Vendor not found');
        router.push('/admin/vendors');
      }
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
      toast.error('Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, reason?: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        if (action === 'reject') {
          setShowRejectDialog(false);
          setRejectionReason('');
        }
        fetchShop();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Failed to perform action');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Vendor not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 mt-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 ml-3">
          <h1 className="text-3xl font-bold tracking-tight">{shop.shopName}</h1>
          <p className="text-muted-foreground">Vendor Details</p>
        </div>
        <div className="flex gap-2">
          {shop.isApproved ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Approved
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-500">
              Pending Approval
            </Badge>
          )}
          {shop.isActive ? (
            <Badge variant="default">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!shop.isApproved && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Pending Approval</CardTitle>
            <CardDescription className="text-orange-700">
              This vendor is waiting for approval. Review the details and approve or reject the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={() => handleAction('approve')}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Vendor
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
          </CardContent>
        </Card>
      )}

      {shop.rejectionReason && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Rejection Reason</AlertTitle>
          <AlertDescription>{shop.rejectionReason}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop.stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop.stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{shop.stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop.commissionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shop Information */}
        <Card>
          <CardHeader>
            <CardTitle>Shop Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Shop Name</p>
                <p className="font-medium">{shop.shopName}</p>
                <p className="text-sm text-muted-foreground">/{shop.slug}</p>
              </div>
            </div>

            {shop.description && (
              <div className="flex items-start gap-3">
                <div className="h-5 w-5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{shop.description}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm">
                  {shop.address.street}<br />
                  {shop.address.city}, {shop.address.state} {shop.address.pincode}<br />
                  {shop.address.country}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Joined</p>
                <p className="text-sm">{new Date(shop.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {shop.approvalDate && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-sm">{new Date(shop.approvalDate).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card>
          <CardHeader>
            <CardTitle>Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{shop.ownerId?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{shop.ownerId?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{shop.ownerId?.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-sm">{shop.ownerId?.createdAt ? new Date(shop.ownerId.createdAt).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shop.gstNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">GST Number</p>
                <p className="font-mono text-sm">{shop.gstNumber}</p>
              </div>
            )}

            {shop.panNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">PAN Number</p>
                <p className="font-mono text-sm">{shop.panNumber}</p>
              </div>
            )}

            {!shop.gstNumber && !shop.panNumber && (
              <p className="text-sm text-muted-foreground">No business details provided</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {shop.isApproved && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {shop.isActive ? (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('deactivate')}
                  disabled={processing}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Deactivate Shop
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('activate')}
                  disabled={processing}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Activate Shop
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href={`/admin/vendors/${vendorId}/products`}>
                  <Package className="h-4 w-4 mr-2" />
                  View Products
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Vendor Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this vendor application. This will be sent to the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Incomplete business documents, invalid GST number, business type not suitable..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('reject', rejectionReason)}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
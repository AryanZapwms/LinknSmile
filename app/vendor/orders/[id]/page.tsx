'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft, Package, User, MapPin, CreditCard, 
  DollarSign, Calendar, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  items: any[];
  vendorSubtotal: number;
  vendorEarnings: number;
  platformCommission: number;
  payoutStatus: string;
  shippingAddress: any;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function VendorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}`);
      const data = await res.json();

      if (data.success) {
        setOrder(data.order);
      } else {
        toast.error('Order not found');
        router.push('/vendor/orders');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchOrder();
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Order not found</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'outline', color: 'text-orange-600' },
      processing: { variant: 'secondary', color: 'text-blue-600' },
      shipped: { variant: 'default', color: 'text-purple-600' },
      delivered: { variant: 'default', color: 'text-green-600' },
      cancelled: { variant: 'destructive', color: 'text-red-600' },
    };

    const config = variants[status] || { variant: 'outline', color: '' };

    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
          <p className="text-muted-foreground">#{order.orderNumber}</p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(order.orderStatus)}
          {order.paymentStatus === 'completed' && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Paid
            </Badge>
          )}
        </div>
      </div>

      {/* Status Management */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            Update Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {order.orderStatus === 'pending' && (
              <Button 
                onClick={() => updateStatus('processing')} 
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Processing
              </Button>
            )}
            {(order.orderStatus === 'pending' || order.orderStatus === 'processing') && (
              <Button 
                onClick={() => updateStatus('shipped')} 
                disabled={updating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Mark as Shipped
              </Button>
            )}
            {order.orderStatus === 'shipped' && (
              <Button 
                onClick={() => updateStatus('delivered')} 
                disabled={updating}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Delivered
              </Button>
            )}
            {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
              <Button 
                variant="outline" 
                onClick={() => updateStatus('cancelled')} 
                disabled={updating}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel Order
              </Button>
            )}
            {updating && <span className="text-sm text-muted-foreground animate-pulse self-center">Updating...</span>}
          </div>
        </CardContent>
      </Card>


      {/* Payout Status Alert */}
      {order.payoutStatus === 'pending' && order.orderStatus === 'delivered' && (
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertTitle>Payout Pending</AlertTitle>
          <AlertDescription>
            Your earnings of ₹{order.vendorEarnings.toFixed(2)} for this order are ready to be released. 
            Payout will be processed once you request it from the Payouts page.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Your Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                  {item.product?.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      width={64}
                      height={64}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product?.name || 'Product'}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-muted-foreground">
                        Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                    {item.vendorEarnings && (
                      <p className="text-sm text-green-600">
                        Earnings: ₹{item.vendorEarnings.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Earnings Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal (Your Items)</span>
                <span>₹{order.vendorSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Platform Commission</span>
                <span>- ₹{order.platformCommission.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Your Earnings</span>
                <span className="text-green-600">₹{order.vendorEarnings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payout Status</span>
                <Badge variant={order.payoutStatus === 'released' ? 'default' : 'outline'}>
                  {order.payoutStatus === 'pending' ? 'Pending' : 
                   order.payoutStatus === 'released' ? 'Released' : 'Held'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="font-medium">{order.user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="font-medium">{order.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="font-medium">{order.user.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Order Date</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.street}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                {order.shippingAddress.zipCode || order.shippingAddress.pincode}<br />
                {order.shippingAddress.country}
              </p>
              <p className="text-sm">
                <strong>Phone:</strong> {order.shippingAddress.phone}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="font-medium capitalize">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                <Badge variant={order.paymentStatus === 'completed' ? 'default' : 'outline'}>
                  {order.paymentStatus === 'completed' ? 'Completed' : 'Pending'}
                </Badge>
              </div>
              {order.razorpayPaymentId && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Payment ID</p>
                  <p className="font-mono text-sm">{order.razorpayPaymentId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
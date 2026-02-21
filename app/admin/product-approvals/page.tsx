'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { CheckCircle, XCircle, Eye, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  approvalStatus: string;
  submittedAt: string;
  shopId?: { shopName: string };
  company?: { name: string; slug: string };
  category?: { name: string };
}

export default function ProductApprovalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/pending?status=${statusFilter}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'approve' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Product approved successfully');
        fetchProducts();
      } else {
        toast.error(data.message || 'Failed to approve product');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve product');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          action: 'reject',
          rejectionReason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Product rejected');
        setShowRejectDialog(false);
        setRejectionReason('');
        setSelectedProduct(null);
        fetchProducts();
      } else {
        toast.error(data.message || 'Failed to reject product');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject product');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAll = async () => {
    if (products.length === 0) return;
    
    if (!confirm(`Are you sure you want to approve all ${products.length} pending products?`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/products/approve-all', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'All products approved');
        fetchProducts();
      } else {
        toast.error(data.message || 'Failed to approve all products');
      }
    } catch (error) {
      console.error('Approve all error:', error);
      toast.error('Failed to approve all products');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (product: Product) => {
    setSelectedProduct(product);
    setShowRejectDialog(true);
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve vendor product submissions
          </p>
        </div>
        {statusFilter === 'pending' && products.length > 0 && (
          <Button 
            onClick={handleApproveAll} 
            disabled={processing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All ({products.length})
          </Button>
        )}
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === 'pending'
                  ? 'No pending products to review'
                  : `No ${statusFilter} products`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Product</TableHead>
                  <TableHead className="text-center">Vendor</TableHead>
                  <TableHead className="text-center">Brand</TableHead>
                  <TableHead className="text-center">Price</TableHead>
                  <TableHead className="text-center">Submitted</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {/* <TableHead className="text-center">Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className='border'>
                      <div className="flex items-center gap-3 ">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.category?.name || 'Uncategorized'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='border'>
                      <p className="font-medium">
                        {product.shopId?.shopName || 'Unknown'}
                      </p>
                    </TableCell>
                    <TableCell className='border'>{product.company?.name || 'N/A'}</TableCell>
                    <TableCell>₹{product.price}</TableCell>
                    <TableCell className='border'>
                      {new Date(product.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className='border'>
                      {product.approvalStatus === 'pending' && (
                        <Badge variant="outline" className="text-orange-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {product.approvalStatus === 'approved' && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 text-center " />
                          Approved
                        </Badge>
                      )}
                      {product.approvalStatus === 'rejected' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 text-center" />
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    {/* <TableCell className=" border">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={`/shop/${product.company?.slug || 'brand'}/product/${product._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        {product.approvalStatus === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => handleApprove(product._id)}
                              disabled={processing}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRejectDialog(product)}
                              disabled={processing}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedProduct?.name}". This will be sent to the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Product images are unclear, description needs more details, pricing seems incorrect..."
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
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
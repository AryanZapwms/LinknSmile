'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ExternalLink,
  CreditCard,
  Building2,
  User,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface PayoutRequest {
  _id: string;
  shopId: {
    _id: string;
    shopName: string;
    bankDetails: {
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string;
    };
  };
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestDate: string;
  processedDate?: string;
  transactionId?: string;
  notes?: string;
  failureReason?: string;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts?status=${statusFilter}`);
      const json = await res.json();
      if (json.success) {
        setPayouts(json.payouts);
      } else {
        toast.error('Failed to fetch payouts');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (payoutId: string, action: string, data: any = {}) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, action, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setIsCompleteDialogOpen(false);
        setIsRejectDialogOpen(false);
        setTransactionId('');
        setRejectionReason('');
        fetchPayouts();
      } else {
        toast.error(json.message || 'Failed to update payout');
      }
    } catch (error) {
      toast.error('Failed to update payout');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'processing': return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Processing</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = {
    pendingCount: payouts.filter(p => p.status === 'pending').length,
    pendingAmount: payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    totalPaid: payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vendor Payouts</h1>
        <p className="text-muted-foreground">Review and process withdrawal requests from vendors.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-yellow-50/50 border-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">₹{stats.pendingAmount.toLocaleString()} total</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifecycle total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payouts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1"></div>
            <Button variant="outline" size="sm" onClick={fetchPayouts}>
              Refresh List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No payout requests found.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout._id} className="group">
                    <TableCell>
                      <div className="font-medium">{payout.shopId?.shopName || 'Unknown Shop'}</div>
                      <div className="text-xs text-muted-foreground">ID: {payout._id.slice(-8)}</div>
                    </TableCell>
                    <TableCell className="font-bold text-base">
                      ₹{payout.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {payout.shopId?.bankDetails?.accountHolderName}
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <CreditCard className="h-3 w-3" /> {payout.shopId?.bankDetails?.accountNumber}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {payout.shopId?.bankDetails?.ifscCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payout.status)}
                      {payout.transactionId && (
                        <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                          TXN: {payout.transactionId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(payout.requestDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {payout.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleAction(payout._id, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedPayout(payout);
                                setIsRejectDialogOpen(true);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {payout.status === 'processing' && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setIsCompleteDialogOpen(true);
                            }}
                          >
                            Complete Payout
                          </Button>
                        )}
                        {payout.status === 'completed' && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-none capitalize">Processed</Badge>
                        )}
                        {payout.status === 'failed' && (
                          <div className="text-[10px] text-red-500 italic max-w-[100px] truncate">
                            {payout.failureReason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Completion Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payout</DialogTitle>
            <DialogDescription>
              Enter the transaction ID after performing the bank transfer to ₹{selectedPayout?.amount.toLocaleString()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction ID / Reference</label>
              <Input 
                placeholder="e.g. UTR123456789" 
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Cancel</Button>
            <Button 
              disabled={!transactionId || submitting}
              onClick={() => handleAction(selectedPayout!._id, 'complete', { transactionId })}
            >
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payout request. This will be visible to the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection</label>
              <Textarea 
                placeholder="e.g. Invalid bank details, Minimum balance not met after order correction..." 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              disabled={!rejectionReason || submitting}
              onClick={() => handleAction(selectedPayout!._id, 'reject', { failureReason: rejectionReason })}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

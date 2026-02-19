'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowRight,
  Wallet,
  Building2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PayoutRequest {
  _id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestDate: string;
  processedDate?: string;
  transactionId?: string;
  notes?: string;
  failureReason?: string;
}

interface PayoutStats {
  availableBalance: number;
  totalEarnings: number;
  pendingPayouts: number;
  releasedPayouts: number;
  payouts: PayoutRequest[];
}

export default function VendorPayoutsPage() {
  const [data, setData] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await fetch('/api/vendor/payouts');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        toast.error(json.message || 'Failed to fetch payouts');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(requestAmount);

    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum withdrawal amount is ₹500');
      return;
    }

    if (amount > (data?.availableBalance || 0)) {
      toast.error('Amount exceeds available balance');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success('Payout request submitted successfully!');
        setRequestAmount('');
        fetchPayouts();
      } else {
        toast.error(json.message || 'Failed to submit request');
      }
    } catch (error) {
      toast.error('Failed to submit request');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="lg:col-span-1 h-[400px]" />
          <Skeleton className="lg:col-span-2 h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Earnings & Payouts</h1>
        <p className="text-muted-foreground">Manage your withdrawals and track your shop performance.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data?.availableBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data?.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data?.pendingPayouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Under processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Total Withdrawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data?.releasedPayouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Request Payout Form */}
        <Card className="lg:col-span-1 shadow-sm border-muted-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Request Withdrawal
            </CardTitle>
            <CardDescription>
              Submit a request to withdraw your earnings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Withdraw</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                  <Input 
                    placeholder="Min. 500" 
                    className="pl-7"
                    type="number"
                    min="500"
                    max={data?.availableBalance}
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum withdrawal amount is ₹500
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Bank Details
                  </span>
                  <Link href="/vendor/settings" className="text-primary text-xs hover:underline">
                    Edit Settings
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground italic">
                  Payouts will be sent to the bank account linked in your shop settings.
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                disabled={submitting || (data?.availableBalance || 0) < 500}
                type="submit"
              >
                {submitting ? 'Submitting...' : 'Request Payout'}
              </Button>

              {(data?.availableBalance || 0) < 500 && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-700">
                    You need at least ₹500 available balance to request a payout.
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="lg:col-span-2 shadow-sm border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Payout History
              </CardTitle>
              <CardDescription>
                Track your previous withdrawal requests and their status.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Request Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.payouts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-muted-foreground">
                        No payout history found.
                      </td>
                    </tr>
                  ) : (
                    data?.payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-4">
                          {new Date(payout.requestDate).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-4 font-medium">₹{payout.amount.toLocaleString()}</td>
                        <td className="py-4">{getStatusBadge(payout.status)}</td>
                        <td className="py-4">
                          {payout.transactionId ? (
                            <code className="text-xs bg-muted p-1 rounded font-mono">{payout.transactionId}</code>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Pending processing</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-blue-50/50 border border-blue-100 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Important Note</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Payouts are usually processed within 3-5 business days after approval. 
                  If you have any issues with your payment, please contact support with the Transaction ID.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

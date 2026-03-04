'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  DollarSign, 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart, 
  Users, 
  ShieldAlert,
  Clock,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface WalletData {
  success: boolean;
  overview: {
    totalVendorLiability: number;
    totalPendingLiability: number;
    totalWithdrawableLiability: number;
    totalFrozenAmount: number;
    platformRevenue: number;
    vendorCount: number;
    activeWallets: number;
    frozenWallets: number;
  };
  payoutBreakdown: Record<string, { total: number; count: number }>;
  pendingPayouts: any[];
  recentActivity: any[];
}

const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const formatINR = (value: number) => 
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);

export default function AdminWalletOverview() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/wallet-overview');
        const json = await res.json();
        if (json.success) setData(json);
      } catch (error) {
        console.error('Failed to fetch wallet overview:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center">Failed to load wallet data</div>;

  const { overview, payoutBreakdown, pendingPayouts } = data;

  const pieData = [
    { name: 'Pending', value: overview.totalPendingLiability },
    { name: 'Withdrawable', value: overview.totalWithdrawableLiability },
    { name: 'Frozen', value: overview.totalFrozenAmount },
  ];

  const payoutChartData = Object.entries(payoutBreakdown).map(([status, stats]) => ({
    name: status,
    amount: stats.total
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground">Monitor platform revenue and vendor liabilities.</p>
        </div>
        <Button onClick={() => router.push('/admin/payouts')} variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          Manage Payouts
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-purple-50/50 border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-purple-600 tracking-wider">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600 absolute right-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(overview.platformRevenue)}</div>
            <p className="text-[10px] text-purple-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> All-time commissions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-blue-600 tracking-wider">Vendor Liability</CardTitle>
            <WalletIcon className="h-4 w-4 text-blue-600 absolute right-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(overview.totalVendorLiability)}</div>
            <p className="text-[10px] text-blue-600 mt-1">Total held for {overview.vendorCount} vendors</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-orange-600 tracking-wider">Withdrawable</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-600 absolute right-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(overview.totalWithdrawableLiability)}</div>
            <p className="text-[10px] text-orange-600 mt-1">Ready for payout</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-red-600 tracking-wider">Frozen Funds</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600 absolute right-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(overview.totalFrozenAmount)}</div>
            <p className="text-[10px] text-red-600 mt-1">{overview.frozenWallets} wallets flagged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Funds Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Liability Composition</CardTitle>
            <CardDescription>Breakdown of vendor funds by state</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => formatINR(value ?? 0)} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Payout Volume</CardTitle>
            <CardDescription>Total amount paid out by status</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payoutChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(value: number | undefined) => formatINR(value ?? 0)} />
                <Bar dataKey="amount" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Recent Withdrawal Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active payout requests.</p>
            ) : (
              pendingPayouts.map((payout, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{payout.shopId?.shopName}</p>
                      <p className="text-[10px] text-muted-foreground">Requested on {new Date(payout.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatINR(payout.amount)}</p>
                    <Badge variant="outline" className="text-[10px] leading-tight h-5 capitalize">
                      {payout.status.toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            {pendingPayouts.length > 0 && (
              <Button variant="ghost" className="w-full text-xs" onClick={() => router.push('/admin/payouts')}>
                View all requests
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

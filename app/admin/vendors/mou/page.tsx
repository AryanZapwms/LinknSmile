"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Clock, FileCheck2, Loader2, Mail, Search, Users } from "lucide-react";
// Not sonner: its <Toaster> isn't mounted (see README "Known Issues"), so
// sonner's toast() shows nothing. This is the toaster app/layout.tsx mounts.
import { useToast } from "@/hooks/use-toast";
import { LOCALE } from "@/lib/currency";

interface MouVendor {
  shopId: string;
  shopName: string;
  isApproved: boolean;
  owner: { name: string | null; email: string | null };
  accepted: boolean;
  acceptedAt: string | null;
  reminderCount: number;
  lastRemindedAt: string | null;
  nextReminderAt: string | null;
  canRemind: boolean;
}

interface MouList {
  mouVersion: string;
  cooldownHours: number;
  summary: { total: number; accepted: number; pending: number };
  vendors: MouVendor[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ReminderResult {
  shopId: string;
  shopName: string | null;
  email: string | null;
  status: "sent" | "failed" | "skipped";
  reason?: "already_accepted" | "cooldown" | "no_email" | "not_found";
}

interface ReminderRun {
  results: ReminderResult[];
  summary: { sent: number; failed: number; skipped: number; remaining: number };
  stopped: "time_budget" | "send_failures" | null;
}

const PAGE_SIZE = 20;
const RESULT_ORDER = { failed: 0, sent: 1, skipped: 2 };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(LOCALE, { year: "numeric", month: "short", day: "numeric" });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function describeResult(result: ReminderResult | undefined, cooldownHours: number): string {
  if (!result) return "No result returned";
  if (result.status === "sent") return "Reminder sent";
  if (result.status === "failed") return "Email could not be sent";
  switch (result.reason) {
    case "already_accepted":
      return "Already accepted";
    case "cooldown":
      return `Already reminded in the last ${cooldownHours} hours`;
    case "no_email":
      return "No email address on file";
    case "not_found":
      return "Not an active vendor";
    default:
      return "Skipped";
  }
}

function ResultBadge({ status }: { status: ReminderResult["status"] }) {
  if (status === "sent") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-100 text-green-700">
        Sent
      </Badge>
    );
  }
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Skipped</Badge>;
}

export default function AdminVendorMouPage() {
  const { toast } = useToast();
  const [data, setData] = useState<MouList | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [sendingShopId, setSendingShopId] = useState<string | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkRun, setBulkRun] = useState<ReminderRun | null>(null);

  // Only the newest request may update the table: a slow response to an
  // earlier search must not overwrite the result of a later one.
  const latestRequest = useRef(0);

  const fetchVendors = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: statusFilter,
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/vendors/mou?${params}`);
      const json = await res.json();
      if (requestId !== latestRequest.current) return;
      if (json.success) {
        setData(json);
      } else {
        toast({
          title: "Failed to fetch vendors",
          description: json.message,
          variant: "destructive",
        });
      }
    } catch {
      if (requestId === latestRequest.current) {
        toast({ title: "Something went wrong", variant: "destructive" });
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [page, statusFilter, search, toast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // The list can shrink between loads (vendors accept), leaving this page past the end.
  useEffect(() => {
    if (data && page > data.pagination.totalPages) setPage(data.pagination.totalPages);
  }, [data, page]);

  const postReminder = async (body: { all: true } | { shopIds: string[] }): Promise<ReminderRun> => {
    const res = await fetch("/api/admin/vendors/mou/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to send reminders");
    return json;
  };

  const handleRemindOne = async (vendor: MouVendor) => {
    setSendingShopId(vendor.shopId);
    try {
      const run = await postReminder({ shopIds: [vendor.shopId] });
      const result = run.results[0];
      if (result?.status === "sent") {
        toast({ title: "Reminder sent", description: `Emailed ${result.email}` });
      } else {
        toast({
          title: "Reminder not sent",
          description: describeResult(result, data?.cooldownHours ?? 24),
          variant: "destructive",
        });
      }
      fetchVendors();
    } catch (error) {
      toast({
        title: "Failed to send reminder",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSendingShopId(null);
    }
  };

  const handleRemindAll = async () => {
    setBulkSending(true);
    try {
      setBulkRun(await postReminder({ all: true }));
      fetchVendors();
    } catch (error) {
      toast({
        title: "Failed to send reminders",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBulkSending(false);
    }
  };

  const closeBulkDialog = () => {
    setIsBulkDialogOpen(false);
    setBulkRun(null);
  };

  const summary = data?.summary;
  const vendors = data?.vendors ?? [];
  const pagination = data?.pagination;
  const cooldownHours = data?.cooldownHours ?? 24;
  const firstRow = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const bulkResults = bulkRun
    ? [...bulkRun.results].sort((a, b) => RESULT_ORDER[a.status] - RESULT_ORDER[b.status])
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vendor MOU</h1>
        <p className="text-muted-foreground">
          See which vendors have accepted the current Vendor MOU
          {data ? ` (version ${data.mouVersion})` : ""} and remind those who haven&apos;t. Closed,
          rejected and deactivated shops are not listed.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-yellow-100 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? summary.pending : "—"}</div>
            <p className="text-muted-foreground mt-1 text-xs">Have not accepted this version</p>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileCheck2 className="h-4 w-4 text-green-600" />
              Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? summary.accepted : "—"}</div>
            <p className="text-muted-foreground mt-1 text-xs">Accepted this version</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="text-primary h-4 w-4" />
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? summary.total : "—"}</div>
            <p className="text-muted-foreground mt-1 text-xs">Active shops</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search shop, owner or email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1"></div>
            <Button variant="outline" size="sm" onClick={fetchVendors}>
              Refresh List
            </Button>
            <Button
              size="sm"
              disabled={!summary || summary.pending === 0 || sendingShopId !== null}
              onClick={() => setIsBulkDialogOpen(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Remind all pending
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>MOU Status</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Reminders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={loading && data ? "opacity-60" : undefined}>
              {!data ? (
                loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                      Could not load vendors.
                    </TableCell>
                  </TableRow>
                )
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    No vendors found.
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.shopId}>
                    <TableCell>
                      <div className="font-medium">{vendor.shopName}</div>
                      {!vendor.isApproved && (
                        <Badge variant="outline" className="mt-1 border-orange-400 text-orange-600">
                          Pending Approval
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{vendor.owner.name || "—"}</div>
                      <div className="text-muted-foreground text-xs">{vendor.owner.email}</div>
                    </TableCell>
                    <TableCell>
                      {vendor.accepted ? (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-100 text-green-700"
                        >
                          Accepted
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-yellow-200 bg-yellow-100 text-yellow-700"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {vendor.acceptedAt ? formatDate(vendor.acceptedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {vendor.reminderCount > 0 && vendor.lastRemindedAt ? (
                        <>
                          <div className="font-medium">{vendor.reminderCount} sent</div>
                          <div className="text-muted-foreground">
                            Last: {formatDateTime(vendor.lastRemindedAt)}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!vendor.accepted && (
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!vendor.canRemind || sendingShopId !== null || bulkSending}
                            onClick={() => handleRemindOne(vendor)}
                          >
                            {sendingShopId === vendor.shopId ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="mr-2 h-4 w-4" />
                            )}
                            Send reminder
                          </Button>
                          {!vendor.canRemind && (
                            <span className="text-muted-foreground text-[10px]">
                              {vendor.nextReminderAt
                                ? `Next reminder after ${formatDateTime(vendor.nextReminderAt)}`
                                : "No email address on file"}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination && pagination.total > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Showing {firstRow}–{firstRow + vendors.length - 1} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remind All Dialog */}
      <Dialog
        open={isBulkDialogOpen}
        onOpenChange={(open) => {
          if (bulkSending) return;
          if (open) setIsBulkDialogOpen(true);
          else closeBulkDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remind all pending vendors</DialogTitle>
            <DialogDescription>
              {bulkRun
                ? `Sent ${bulkRun.summary.sent} · Failed ${bulkRun.summary.failed} · Skipped ${bulkRun.summary.skipped}`
                : `This emails every vendor who has not accepted MOU version ${data?.mouVersion ?? ""} — up to ${summary?.pending ?? 0} vendor(s). Anyone reminded in the last ${cooldownHours} hours is skipped. Emails go out one at a time, so this can take up to a minute.`}
            </DialogDescription>
          </DialogHeader>

          {bulkRun && (
            <div className="space-y-3">
              {bulkRun.stopped === "send_failures" && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Stopped after repeated failed sends. Check the email configuration before trying
                  again.
                </div>
              )}
              {bulkRun.summary.remaining > 0 && (
                <p className="text-sm">
                  {bulkRun.summary.remaining} vendor(s) were not emailed in this run.
                </p>
              )}
              {bulkResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">No vendors needed a reminder.</p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {bulkResults.map((result) => (
                    <div
                      key={result.shopId}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {result.shopName || "Unknown shop"}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {result.email || "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <ResultBadge status={result.status} />
                        {result.status !== "sent" && (
                          <span className="text-muted-foreground text-[10px]">
                            {describeResult(result, cooldownHours)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={bulkSending} onClick={closeBulkDialog}>
              {bulkRun ? "Close" : "Cancel"}
            </Button>
            {(!bulkRun || bulkRun.summary.remaining > 0) && (
              <Button disabled={bulkSending} onClick={handleRemindAll}>
                {bulkSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {bulkSending
                  ? "Sending…"
                  : !bulkRun
                    ? "Send reminders"
                    : bulkRun.stopped === "send_failures"
                      ? "Try again"
                      : "Send next batch"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

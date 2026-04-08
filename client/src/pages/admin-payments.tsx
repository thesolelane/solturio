import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  Eye,
  ArrowLeft,
  TrendingUp,
  Coins,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

interface PaymentRecord {
  id: string;
  userId: string;
  collectionId: string | null;
  logoId: string | null;
  transactionSignature: string | null;
  fromWallet: string;
  toWallet: string;
  amount: string;
  tokenType: string;
  status: string;
  paymentType: string;
  logoCount: number | null;
  pricingTier: string | null;
  rentalMonths: number | null;
  blockNumber: number | null;
  confirmedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface PaymentStats {
  overview: {
    totalPayments: number;
    confirmedPayments: number;
    pendingPayments: number;
    failedPayments: number;
    totalVolume: { byToken: Record<string, string> };
  };
  byPaymentType: Record<string, number>;
  byTokenType: Array<{ symbol: string; count: number; totalAmount: string }>;
  recentPayments: PaymentRecord[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Confirmed
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getPaymentTypeBadge(type: string) {
  switch (type) {
    case "minting":
      return (
        <Badge variant="outline" className="gap-1">
          <Coins className="w-3 h-3" />
          Minting
        </Badge>
      );
    case "rental":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          Rental
        </Badge>
      );
    case "subscription":
      return (
        <Badge variant="outline" className="gap-1">
          <TrendingUp className="w-3 h-3" />
          Subscription
        </Badge>
      );
    case "iscl":
      return (
        <Badge variant="outline" className="gap-1">
          <DollarSign className="w-3 h-3" />
          ISCL
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function truncateAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default function AdminPayments() {
  const { user, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tokenFilter, setTokenFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const limit = 20;

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const statsQuery = useQuery<PaymentStats>({
    queryKey: ["/api/admin/payments/stats"],
    enabled: !!isAdmin,
  });

  const buildPaymentsUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (tokenFilter !== "all") params.set("tokenType", tokenFilter);
    if (typeFilter !== "all") params.set("paymentType", typeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const qs = params.toString();
    return `/api/admin/payments${qs ? `?${qs}` : ""}`;
  };

  const paymentsQuery = useQuery<{
    payments: PaymentRecord[];
    total: number;
    page: number;
    limit: number;
    stats: any;
  }>({
    queryKey: ["/api/admin/payments", statusFilter, tokenFilter, typeFilter, search, page, limit],
    queryFn: async () => {
      const res = await fetch(buildPaymentsUrl(), { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!isAdmin,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Admin access required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = statsQuery.data;
  const payments = paymentsQuery.data?.payments || [];
  const totalPayments = paymentsQuery.data?.total || 0;
  const totalPages = Math.ceil(totalPayments / limit);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-payments-title">
              Payment Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Track crypto payments and financial activity across the platform
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            statsQuery.refetch();
            paymentsQuery.refetch();
          }}
          disabled={statsQuery.isRefetching || paymentsQuery.isRefetching}
          data-testid="button-refresh-payments"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${statsQuery.isRefetching || paymentsQuery.isRefetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-payments">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalPayments}</div>
            </CardContent>
          </Card>
          <Card data-testid="card-confirmed-payments">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.confirmedPayments}</div>
            </CardContent>
          </Card>
          <Card data-testid="card-pending-payments">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.pendingPayments}</div>
            </CardContent>
          </Card>
          <Card data-testid="card-failed-payments">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.failedPayments}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {stats &&
        stats.overview.totalVolume &&
        Object.keys(stats.overview.totalVolume.byToken).length > 0 && (
          <Card data-testid="card-token-breakdown">
            <CardHeader>
              <CardTitle className="text-lg">Revenue by Token</CardTitle>
              <CardDescription>
                Payment volume across all accepted tokens (auto-updates when new tokens are added)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Object.entries(stats.overview.totalVolume.byToken).map(([symbol, amount]) => {
                  const tokenDetail = stats.byTokenType.find((t) => t.symbol === symbol);
                  const count = tokenDetail?.count || 0;
                  return (
                    <div
                      key={symbol}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`token-stat-${symbol}`}
                    >
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {parseFloat((amount as string) || "0").toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {count} payment{count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      {stats && Object.keys(stats.byPaymentType).length > 0 && (
        <Card data-testid="card-type-breakdown">
          <CardHeader>
            <CardTitle className="text-lg">By Payment Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byPaymentType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 p-2 rounded-md border">
                  {getPaymentTypeBadge(type)}
                  <span className="text-sm font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>All payments across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by transaction or wallet..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                data-testid="input-search-payments"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={tokenFilter}
              onValueChange={(v) => {
                setTokenFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-token-filter">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                {stats?.byTokenType.map((t) => (
                  <SelectItem key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="minting">Minting</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="iscl">ISCL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell>
                            <div className="text-sm">
                              {payment.userFirstName && payment.userLastName
                                ? `${payment.userFirstName} ${payment.userLastName}`
                                : payment.userEmail || "Unknown"}
                            </div>
                            {payment.userEmail && payment.userFirstName && (
                              <div className="text-xs text-muted-foreground">
                                {payment.userEmail}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {parseFloat(payment.amount).toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.tokenType}</Badge>
                          </TableCell>
                          <TableCell>{getPaymentTypeBadge(payment.paymentType)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.transactionSignature ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {truncateAddress(payment.transactionSignature, 8)}
                                </span>
                                <a
                                  href={`https://explorer.solana.com/tx/${payment.transactionSignature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                  data-testid={`link-explorer-${payment.id}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.createdAt
                              ? format(new Date(payment.createdAt), "MMM d, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedPayment(payment)}
                              data-testid={`button-view-payment-${payment.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1}-{Math.min(page * limit, totalPayments)} of{" "}
                    {totalPayments}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Full details for this payment record</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <div className="mt-1">{getPaymentTypeBadge(selectedPayment.paymentType)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-mono font-bold text-lg">
                    {parseFloat(selectedPayment.amount).toFixed(6)} {selectedPayment.tokenType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="text-sm">
                    {selectedPayment.userFirstName && selectedPayment.userLastName
                      ? `${selectedPayment.userFirstName} ${selectedPayment.userLastName}`
                      : selectedPayment.userEmail || "Unknown"}
                  </p>
                  {selectedPayment.userEmail && (
                    <p className="text-xs text-muted-foreground">{selectedPayment.userEmail}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">From Wallet</p>
                  <p className="text-xs font-mono break-all" data-testid="text-from-wallet">
                    {selectedPayment.fromWallet}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To Wallet</p>
                  <p className="text-xs font-mono break-all" data-testid="text-to-wallet">
                    {selectedPayment.toWallet}
                  </p>
                </div>
                {selectedPayment.transactionSignature && (
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Signature</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono break-all">
                        {selectedPayment.transactionSignature}
                      </p>
                      <a
                        href={`https://explorer.solana.com/tx/${selectedPayment.transactionSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="link-explorer-detail"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                {selectedPayment.pricingTier && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pricing Tier</p>
                    <p className="text-sm">{selectedPayment.pricingTier}</p>
                  </div>
                )}
                {selectedPayment.logoCount != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Logo Count</p>
                    <p className="text-sm">{selectedPayment.logoCount}</p>
                  </div>
                )}
                {selectedPayment.rentalMonths != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rental Months</p>
                    <p className="text-sm">{selectedPayment.rentalMonths}</p>
                  </div>
                )}
                {selectedPayment.blockNumber != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Block Number</p>
                    <p className="text-sm font-mono">{selectedPayment.blockNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {selectedPayment.createdAt
                      ? format(new Date(selectedPayment.createdAt), "MMM d, yyyy HH:mm")
                      : "-"}
                  </p>
                </div>
                {selectedPayment.confirmedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed</p>
                    <p className="text-sm">
                      {format(new Date(selectedPayment.confirmedAt), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

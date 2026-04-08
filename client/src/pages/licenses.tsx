import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Shield,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  FileSignature,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Building2,
  User,
  Calendar,
  Coins,
  Link2,
  Search,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import type { LicenseContract } from "@shared/schema";
import { PLATFORM_BITS, LICENSE_TYPES } from "@shared/schema";

const JURISDICTION_NAMES: Record<string, string> = {
  US: "United States",
  EU: "European Union",
  UK: "United Kingdom",
  CA: "Canada",
  JP: "Japan",
  SG: "Singapore",
  AU: "Australia",
  INTL: "International",
};

type LicenseWithDetails = LicenseContract & {
  logo?: {
    id: string;
    fileName: string;
    thumbnailUrl: string | null;
  };
  collection?: {
    id: string;
    name: string;
    companyName: string | null;
  };
  userRole?: "licensor" | "licensee";
  permittedPlatformsList?: string[];
};

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Clock, color: "bg-muted text-muted-foreground" },
  pending_acceptance: {
    label: "Pending Acceptance",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  pending_licensee_signature: {
    label: "Awaiting Licensee",
    icon: Clock,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  pending_payment: {
    label: "Awaiting Payment",
    icon: Coins,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  pending_deployment: {
    label: "Deploying",
    icon: Clock,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  active: {
    label: "Active",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  revoked: {
    label: "Revoked",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  transferred: {
    label: "Transferred",
    icon: CheckCircle2,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

export default function Licenses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLicenses, setExpandedLicenses] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "licensor" | "licensee">("all");
  const [linkTxDialogOpen, setLinkTxDialogOpen] = useState(false);
  const [linkTxLicenseId, setLinkTxLicenseId] = useState<string>("");
  const [linkTxForm, setLinkTxForm] = useState({
    senderWallet: "",
    receiverWallet: "",
    transactionHash: "",
    amount: "",
    currency: "SOL",
    note: "",
  });
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txSearchInput, setTxSearchInput] = useState("");
  const [showTxSearch, setShowTxSearch] = useState(false);

  const toggleLicense = (licenseId: string) => {
    setExpandedLicenses((prev) => {
      const next = new Set(prev);
      if (next.has(licenseId)) {
        next.delete(licenseId);
      } else {
        next.add(licenseId);
      }
      return next;
    });
  };

  useEffect(() => {
    document.title = "My Licenses - Solturio";
  }, []);

  const { data: licenses = [], isLoading } = useQuery<LicenseWithDetails[]>({
    queryKey: ["/api/licenses"],
    enabled: isAuthenticated,
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const acceptMutation = useMutation({
    mutationFn: async (licenseId: string) => {
      const res = await apiRequest("POST", `/api/licenses/${licenseId}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      toast({
        title: "License Accepted",
        description: "The license is now active. You have full access to the licensed content.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept license",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const linkTransactionMutation = useMutation({
    mutationFn: async ({ licenseId, data }: { licenseId: string; data: typeof linkTxForm }) => {
      const res = await apiRequest("PATCH", `/api/licenses/${licenseId}/link-transaction`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      setLinkTxDialogOpen(false);
      setLinkTxForm({
        senderWallet: "",
        receiverWallet: "",
        transactionHash: "",
        amount: "",
        currency: "SOL",
        note: "",
      });
      toast({
        title: "Transaction Linked",
        description: "The P2P transaction has been linked to this license.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to link transaction",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const openLinkTxDialog = (licenseId: string, license: LicenseWithDetails) => {
    setLinkTxLicenseId(licenseId);
    setLinkTxForm({
      senderWallet: license.p2pSenderWallet || "",
      receiverWallet: license.p2pReceiverWallet || "",
      transactionHash: license.p2pTransactionHash || "",
      amount: license.p2pTransactionAmount || "",
      currency: license.p2pTransactionCurrency || "SOL",
      note: license.p2pTransactionNote || "",
    });
    setLinkTxDialogOpen(true);
  };

  const txSearchResults = useQuery<LicenseWithDetails[]>({
    queryKey: ["/api/licenses/search-transaction", txSearchQuery],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/licenses/search-transaction?q=${encodeURIComponent(txSearchQuery)}`
      );
      return res.json();
    },
    enabled: !!txSearchQuery && txSearchQuery.length >= 10,
  });

  const handleTxSearch = () => {
    if (txSearchInput.trim().length >= 10) {
      setTxSearchQuery(txSearchInput.trim());
    }
  };

  const getPlatformPermissions = (bitmap: number): string[] => {
    const enabled: string[] = [];
    Object.entries(PLATFORM_BITS).forEach(([name, bit]) => {
      if (bitmap & (1 << (bit as number))) {
        enabled.push(name.replace(/_/g, " "));
      }
    });
    return enabled;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const licensorLicenses = licenses.filter((l) => l.userRole === "licensor");
  const licenseeLicenses = licenses.filter((l) => l.userRole === "licensee");

  const filteredLicenses =
    activeTab === "all" ? licenses : activeTab === "licensor" ? licensorLicenses : licenseeLicenses;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Shield className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to view your licenses</p>
          <Button asChild data-testid="button-signin-prompt">
            <Link href="/">Go to Home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-20 flex items-center px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 hover-elevate">
              <img
                src="/solturio-logo-light-mode.png"
                alt="Solturio Logo for Light Mode"
                className="w-14 h-14 object-contain dark:hidden"
              />
              <img
                src="/solturio-logo-dark-mode.png"
                alt="Solturio Logo for Dark Mode"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Solturio
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/create-license">
                  <Plus className="w-4 h-4 mr-1" />
                  Create License
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/">Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-semibold mb-2">My Licenses</h1>
              <p className="text-muted-foreground">View and manage your license contracts</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTxSearch(!showTxSearch)}
              data-testid="button-toggle-tx-search"
            >
              <Search className="w-4 h-4 mr-1" />
              Search Transactions
            </Button>
          </div>
        </div>

        {showTxSearch && (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Transaction Search</h3>
              <p className="text-xs text-muted-foreground ml-auto">
                Search by transaction hash or wallet address (min 10 characters)
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter transaction hash or wallet address..."
                value={txSearchInput}
                onChange={(e) => setTxSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTxSearch()}
                data-testid="input-tx-search"
                className="flex-1"
              />
              <Button
                onClick={handleTxSearch}
                disabled={txSearchInput.trim().length < 10}
                data-testid="button-tx-search"
              >
                <Search className="w-4 h-4 mr-1" />
                Search
              </Button>
            </div>
            {txSearchResults.isLoading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </div>
            )}
            {txSearchQuery && txSearchResults.data && (
              <div className="mt-3">
                {txSearchResults.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No licenses found matching that transaction hash or wallet address.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {txSearchResults.data.length} license(s) found
                    </p>
                    {txSearchResults.data.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 bg-muted/30 rounded-lg text-sm"
                        data-testid={`tx-search-result-${result.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <span className="font-medium">
                            {result.collection?.name ||
                              result.logo?.fileName ||
                              `License #${result.id.slice(0, 8)}`}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {LICENSE_TYPES[result.licenseType as keyof typeof LICENSE_TYPES] ||
                              result.licenseType}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          {result.p2pTransactionHash && (
                            <div>
                              <span className="block text-muted-foreground/70">Tx Hash</span>
                              <code className="font-mono">
                                {result.p2pTransactionHash.slice(0, 12)}...
                                {result.p2pTransactionHash.slice(-4)}
                              </code>
                            </div>
                          )}
                          {result.p2pTransactionAmount && (
                            <div>
                              <span className="block text-muted-foreground/70">Amount</span>
                              <span className="font-medium">
                                {result.p2pTransactionAmount}{" "}
                                {result.p2pTransactionCurrency || "SOL"}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="block text-muted-foreground/70">Created</span>
                            <span>{formatDate(result.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({licenses.length})
            </TabsTrigger>
            <TabsTrigger value="licensor" data-testid="tab-licensor">
              <Building2 className="w-4 h-4 mr-1" />
              As Licensor ({licensorLicenses.length})
            </TabsTrigger>
            <TabsTrigger value="licensee" data-testid="tab-licensee">
              <User className="w-4 h-4 mr-1" />
              As Licensee ({licenseeLicenses.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredLicenses.length === 0 ? (
          <Card className="p-12 text-center">
            <FileSignature className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No licenses yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === "all"
                ? "Create your first license contract to protect and monetize your IP"
                : activeTab === "licensor"
                  ? "You haven't created any licenses as a licensor"
                  : "You haven't received any licenses as a licensee"}
            </p>
            <Button asChild data-testid="button-create-first">
              <Link href="/create-license">
                <Plus className="w-4 h-4 mr-1" />
                Create License
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLicenses.map((license) => {
              const isExpanded = expandedLicenses.has(license.id);
              const statusConfig =
                STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;
              const platforms =
                license.permittedPlatformsList ||
                getPlatformPermissions(license.platformBitmap || 0);
              const isLicensor = license.userRole === "licensor";

              return (
                <Card key={license.id} data-testid={`license-${license.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleLicense(license.id)}>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <CollapsibleTrigger
                          className="flex items-start gap-3 text-left hover-elevate rounded-md p-1 -m-1"
                          data-testid={`toggle-${license.id}`}
                        >
                          <div className="mt-1">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h2 className="text-lg font-semibold">
                                {license.collection?.name ||
                                  license.logo?.fileName ||
                                  `License #${license.id.slice(0, 8)}`}
                              </h2>
                              <Badge variant="outline" className="text-xs">
                                {isLicensor ? "Licensor" : "Licensee"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(license.createdAt)}
                              </span>
                              <span>
                                {LICENSE_TYPES[license.licenseType as keyof typeof LICENSE_TYPES] ||
                                  license.licenseType}
                              </span>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${statusConfig.color} gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="px-6 pb-6 space-y-4">
                        {license.imageColorPalette && license.imageColorPalette.length > 0 && (
                          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg mb-4">
                            <div className="flex-shrink-0">
                              <p className="text-xs text-muted-foreground mb-1">Image Colors</p>
                              <div className="flex gap-1">
                                {license.imageColorPalette
                                  .slice(0, 6)
                                  .map((color: string, i: number) => (
                                    <div
                                      key={i}
                                      className="w-5 h-5 rounded border"
                                      style={{ backgroundColor: color }}
                                      title={color}
                                    />
                                  ))}
                              </div>
                            </div>
                            {license.imageCreatedAt && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Image Registered
                                </p>
                                <p className="text-sm font-medium">
                                  {formatDate(license.imageCreatedAt)}
                                </p>
                              </div>
                            )}
                            {license.licenseIssuedAt && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">License Issued</p>
                                <p className="text-sm font-medium">
                                  {formatDate(license.licenseIssuedAt)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">License Type</p>
                            <p className="text-sm font-medium">
                              {LICENSE_TYPES[license.licenseType as keyof typeof LICENSE_TYPES] ||
                                license.licenseType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Duration</p>
                            <p className="text-sm font-medium">
                              {license.isPerpetual
                                ? "Perpetual"
                                : license.durationDays
                                  ? `${license.durationDays} days`
                                  : "Not specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Jurisdiction</p>
                            <p className="text-sm font-medium">
                              {JURISDICTION_NAMES[license.jurisdictionCode || "US"] ||
                                license.jurisdictionCode ||
                                "United States"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Territory</p>
                            <p className="text-sm font-medium">
                              {license.geographicScope || "Worldwide"}
                            </p>
                          </div>
                          {license.upfrontPaymentAmount && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Upfront Payment</p>
                              <p className="text-sm font-medium">
                                {license.upfrontPaymentAmount}{" "}
                                {license.upfrontPaymentCurrency || "SOL"}
                              </p>
                            </div>
                          )}
                          {license.royaltyPercentage && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Royalty</p>
                              <p className="text-sm font-medium">{license.royaltyPercentage}%</p>
                            </div>
                          )}
                          {license.startsAt && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                              <p className="text-sm font-medium">{formatDate(license.startsAt)}</p>
                            </div>
                          )}
                          {license.expiresAt && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Expiration Date</p>
                              <p className="text-sm font-medium">{formatDate(license.expiresAt)}</p>
                            </div>
                          )}
                        </div>

                        {platforms.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Platform Permissions
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {platforms.map((platform) => (
                                <Badge key={platform} variant="secondary" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {(license.canModify || license.canSublicense || license.canTransfer) && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Rights Granted</p>
                            <div className="flex flex-wrap gap-1">
                              {license.canModify && (
                                <Badge variant="outline" className="text-xs">
                                  Modify
                                </Badge>
                              )}
                              {license.canSublicense && (
                                <Badge variant="outline" className="text-xs">
                                  Sublicense
                                </Badge>
                              )}
                              {license.canTransfer && (
                                <Badge variant="outline" className="text-xs">
                                  Transfer
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {(license.currentHolderName || license.currentHolderWallet) && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Current Holder</p>
                            <div className="text-sm">
                              {license.currentHolderName && (
                                <p className="font-medium">{license.currentHolderName}</p>
                              )}
                              {license.currentHolderWallet && (
                                <code className="text-xs font-mono text-muted-foreground">
                                  {license.currentHolderWallet.slice(0, 8)}...
                                  {license.currentHolderWallet.slice(-4)}
                                </code>
                              )}
                            </div>
                          </div>
                        )}

                        {license.governingLaw && (
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">Legal Framework</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Governing Law: </span>
                                <span className="font-medium">{license.governingLaw}</span>
                              </div>
                              {license.disputeVenue && (
                                <div>
                                  <span className="text-muted-foreground">Dispute Venue: </span>
                                  <span className="font-medium">{license.disputeVenue}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {license.gdprCompliant && (
                                <Badge variant="secondary" className="text-xs">
                                  GDPR
                                </Badge>
                              )}
                              {license.pipedaCompliant && (
                                <Badge variant="secondary" className="text-xs">
                                  PIPEDA
                                </Badge>
                              )}
                              {license.pdpaCompliant && (
                                <Badge variant="secondary" className="text-xs">
                                  PDPA
                                </Badge>
                              )}
                              {license.appiCompliant && (
                                <Badge variant="secondary" className="text-xs">
                                  APPI
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              P2P Transaction
                            </p>
                            {isLicensor && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openLinkTxDialog(license.id, license)}
                                data-testid={`button-link-tx-${license.id}`}
                              >
                                <Link2 className="w-3 h-3 mr-1" />
                                {license.p2pTransactionHash ? "Update" : "Link Transaction"}
                              </Button>
                            )}
                          </div>
                          {license.p2pTransactionHash ? (
                            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">
                                    Sender Wallet
                                  </p>
                                  <code
                                    className="text-xs font-mono"
                                    data-testid={`text-tx-sender-${license.id}`}
                                  >
                                    {license.p2pSenderWallet
                                      ? `${license.p2pSenderWallet.slice(0, 8)}...${license.p2pSenderWallet.slice(-4)}`
                                      : "N/A"}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">
                                    Receiver Wallet
                                  </p>
                                  <code
                                    className="text-xs font-mono"
                                    data-testid={`text-tx-receiver-${license.id}`}
                                  >
                                    {license.p2pReceiverWallet
                                      ? `${license.p2pReceiverWallet.slice(0, 8)}...${license.p2pReceiverWallet.slice(-4)}`
                                      : "N/A"}
                                  </code>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">
                                    Transaction Hash
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <code
                                      className="text-xs font-mono truncate"
                                      data-testid={`text-tx-hash-${license.id}`}
                                    >
                                      {license.p2pTransactionHash.slice(0, 12)}...
                                      {license.p2pTransactionHash.slice(-4)}
                                    </code>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() =>
                                        copyToClipboard(
                                          license.p2pTransactionHash!,
                                          `tx-${license.id}`
                                        )
                                      }
                                      data-testid={`button-copy-tx-${license.id}`}
                                    >
                                      {copiedId === `tx-${license.id}` ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </Button>
                                    <Button size="icon" variant="ghost" asChild>
                                      <a
                                        href={`https://solscan.io/tx/${license.p2pTransactionHash}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-testid={`link-tx-explorer-${license.id}`}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                                {license.p2pTransactionAmount && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                                    <p
                                      className="text-sm font-medium"
                                      data-testid={`text-tx-amount-${license.id}`}
                                    >
                                      {license.p2pTransactionAmount}{" "}
                                      {license.p2pTransactionCurrency || "SOL"}
                                    </p>
                                  </div>
                                )}
                                {license.p2pTransactionNote && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Note</p>
                                    <p
                                      className="text-sm"
                                      data-testid={`text-tx-note-${license.id}`}
                                    >
                                      {license.p2pTransactionNote}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No transaction linked yet.{" "}
                              {isLicensor
                                ? "Use the button above to link an external payment."
                                : "The licensor can link a payment transaction to this license."}
                            </p>
                          )}
                        </div>

                        {license.contractAddress && (
                          <div className="border-t pt-4">
                            <p className="text-xs text-muted-foreground mb-2">Contract Address</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded-md overflow-x-auto min-w-0">
                                {license.contractAddress}
                              </code>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() =>
                                        copyToClipboard(license.contractAddress!, license.id)
                                      }
                                      data-testid={`button-copy-${license.id}`}
                                    >
                                      {copiedId === license.id ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy address</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={`https://solscan.io/account/${license.contractAddress}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View on Solana
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}

                        {license.status === "draft" && isLicensor && (
                          <div className="border-t pt-4">
                            <Button data-testid={`button-sign-${license.id}`}>
                              <FileSignature className="w-4 h-4 mr-2" />
                              Sign & Send to Licensee
                            </Button>
                          </div>
                        )}

                        {license.status === "pending_licensee_signature" && !isLicensor && (
                          <div className="border-t pt-4">
                            <Button data-testid={`button-sign-licensee-${license.id}`}>
                              <FileSignature className="w-4 h-4 mr-2" />
                              Sign as Licensee
                            </Button>
                          </div>
                        )}

                        {license.status === "pending_acceptance" && !isLicensor && (
                          <div className="border-t pt-4">
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => acceptMutation.mutate(license.id)}
                                disabled={acceptMutation.isPending}
                                data-testid={`button-accept-${license.id}`}
                              >
                                {acceptMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                Accept License
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                Accept to activate this license and gain access to the content.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={linkTxDialogOpen} onOpenChange={setLinkTxDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Link P2P Transaction
            </DialogTitle>
            <DialogDescription>
              Record an external peer-to-peer payment linked to this license. Solturio does not
              process payments — this creates a verifiable record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tx-sender">Sender Wallet Address</Label>
              <Input
                id="tx-sender"
                placeholder="Sender's Solana wallet address"
                value={linkTxForm.senderWallet}
                onChange={(e) => setLinkTxForm((p) => ({ ...p, senderWallet: e.target.value }))}
                data-testid="input-tx-sender"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-receiver">Receiver Wallet Address</Label>
              <Input
                id="tx-receiver"
                placeholder="Receiver's Solana wallet address"
                value={linkTxForm.receiverWallet}
                onChange={(e) => setLinkTxForm((p) => ({ ...p, receiverWallet: e.target.value }))}
                data-testid="input-tx-receiver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-hash">Transaction Hash</Label>
              <Input
                id="tx-hash"
                placeholder="Solana transaction signature"
                value={linkTxForm.transactionHash}
                onChange={(e) => setLinkTxForm((p) => ({ ...p, transactionHash: e.target.value }))}
                data-testid="input-tx-hash"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tx-amount">Amount</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={linkTxForm.amount}
                  onChange={(e) => setLinkTxForm((p) => ({ ...p, amount: e.target.value }))}
                  data-testid="input-tx-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-currency">Currency</Label>
                <Select
                  value={linkTxForm.currency}
                  onValueChange={(v) => setLinkTxForm((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger data-testid="select-tx-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOL">SOL</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="BONK">BONK</SelectItem>
                    <SelectItem value="CATH">$CATH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-note">Note (optional)</Label>
              <Input
                id="tx-note"
                placeholder="e.g. Payment for logo usage Q1 2025"
                value={linkTxForm.note}
                onChange={(e) => setLinkTxForm((p) => ({ ...p, note: e.target.value }))}
                data-testid="input-tx-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkTxDialogOpen(false)}
              data-testid="button-cancel-link-tx"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                linkTransactionMutation.mutate({ licenseId: linkTxLicenseId, data: linkTxForm })
              }
              disabled={linkTransactionMutation.isPending || !linkTxForm.transactionHash}
              data-testid="button-confirm-link-tx"
            >
              {linkTransactionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Link Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

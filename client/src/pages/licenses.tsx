import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, Loader2, ExternalLink, Copy, Check, FileSignature, 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  ChevronDown, ChevronRight, Plus, Building2, User, Calendar, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import type { LicenseContract } from "@shared/schema";
import { PLATFORM_BITS, LICENSE_TYPES } from "@shared/schema";

const JURISDICTION_NAMES: Record<string, string> = {
  US: 'United States',
  EU: 'European Union',
  UK: 'United Kingdom',
  CA: 'Canada',
  JP: 'Japan',
  SG: 'Singapore',
  AU: 'Australia',
  INTL: 'International',
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
  userRole?: 'licensor' | 'licensee';
  permittedPlatformsList?: string[];
};

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Clock, color: "bg-muted text-muted-foreground" },
  pending_licensee_signature: { label: "Awaiting Licensee", icon: Clock, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  pending_payment: { label: "Awaiting Payment", icon: Coins, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  pending_deployment: { label: "Deploying", icon: Clock, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  active: { label: "Active", icon: CheckCircle2, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  expired: { label: "Expired", icon: XCircle, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  revoked: { label: "Revoked", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  transferred: { label: "Transferred", icon: CheckCircle2, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
};

export default function Licenses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLicenses, setExpandedLicenses] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "licensor" | "licensee">("all");

  const toggleLicense = (licenseId: string) => {
    setExpandedLicenses(prev => {
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
    queryKey: ['/api/licenses'],
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

  const getPlatformPermissions = (bitmap: number): string[] => {
    const enabled: string[] = [];
    Object.entries(PLATFORM_BITS).forEach(([name, bit]) => {
      if (bitmap & (1 << (bit as number))) {
        enabled.push(name.replace(/_/g, ' '));
      }
    });
    return enabled;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const licensorLicenses = licenses.filter(l => l.userRole === 'licensor');
  const licenseeLicenses = licenses.filter(l => l.userRole === 'licensee');

  const filteredLicenses = activeTab === "all" ? licenses :
    activeTab === "licensor" ? licensorLicenses : licenseeLicenses;

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
          <p className="text-muted-foreground mb-6">
            Please sign in to view your licenses
          </p>
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
          <h1 className="text-3xl font-semibold mb-2">My Licenses</h1>
          <p className="text-muted-foreground">
            View and manage your license contracts
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
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
              const statusConfig = STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;
              const platforms = license.permittedPlatformsList || getPlatformPermissions(license.platformBitmap || 0);
              const isLicensor = license.userRole === 'licensor';

              return (
                <Card key={license.id} data-testid={`license-${license.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleLicense(license.id)}>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <CollapsibleTrigger className="flex items-start gap-3 text-left hover-elevate rounded-md p-1 -m-1" data-testid={`toggle-${license.id}`}>
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
                                {license.collection?.name || license.logo?.fileName || `License #${license.id.slice(0, 8)}`}
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
                                {LICENSE_TYPES[license.licenseType as keyof typeof LICENSE_TYPES] || license.licenseType}
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
                                {license.imageColorPalette.slice(0, 6).map((color: string, i: number) => (
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
                                <p className="text-xs text-muted-foreground mb-1">Image Registered</p>
                                <p className="text-sm font-medium">{formatDate(license.imageCreatedAt)}</p>
                              </div>
                            )}
                            {license.licenseIssuedAt && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">License Issued</p>
                                <p className="text-sm font-medium">{formatDate(license.licenseIssuedAt)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">License Type</p>
                            <p className="text-sm font-medium">
                              {LICENSE_TYPES[license.licenseType as keyof typeof LICENSE_TYPES] || license.licenseType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Duration</p>
                            <p className="text-sm font-medium">
                              {license.isPerpetual ? 'Perpetual' : license.durationDays ? `${license.durationDays} days` : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Jurisdiction</p>
                            <p className="text-sm font-medium">{JURISDICTION_NAMES[license.jurisdictionCode || 'US'] || license.jurisdictionCode || 'United States'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Territory</p>
                            <p className="text-sm font-medium">{license.geographicScope || 'Worldwide'}</p>
                          </div>
                          {license.upfrontPaymentAmount && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Upfront Payment</p>
                              <p className="text-sm font-medium">{license.upfrontPaymentAmount} {license.upfrontPaymentCurrency || 'SOL'}</p>
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
                            <p className="text-xs text-muted-foreground mb-2">Platform Permissions</p>
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
                              {license.canModify && <Badge variant="outline" className="text-xs">Modify</Badge>}
                              {license.canSublicense && <Badge variant="outline" className="text-xs">Sublicense</Badge>}
                              {license.canTransfer && <Badge variant="outline" className="text-xs">Transfer</Badge>}
                            </div>
                          </div>
                        )}

                        {(license.currentHolderName || license.currentHolderWallet) && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Current Holder</p>
                            <div className="text-sm">
                              {license.currentHolderName && <p className="font-medium">{license.currentHolderName}</p>}
                              {license.currentHolderWallet && (
                                <code className="text-xs font-mono text-muted-foreground">{license.currentHolderWallet.slice(0, 8)}...{license.currentHolderWallet.slice(-4)}</code>
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
                              {license.gdprCompliant && <Badge variant="secondary" className="text-xs">GDPR</Badge>}
                              {license.pipedaCompliant && <Badge variant="secondary" className="text-xs">PIPEDA</Badge>}
                              {license.pdpaCompliant && <Badge variant="secondary" className="text-xs">PDPA</Badge>}
                              {license.appiCompliant && <Badge variant="secondary" className="text-xs">APPI</Badge>}
                            </div>
                          </div>
                        )}

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
                                      onClick={() => copyToClipboard(license.contractAddress!, license.id)}
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
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
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

                        {(license.status === 'draft' && isLicensor) && (
                          <div className="border-t pt-4">
                            <Button data-testid={`button-sign-${license.id}`}>
                              <FileSignature className="w-4 h-4 mr-2" />
                              Sign & Send to Licensee
                            </Button>
                          </div>
                        )}

                        {(license.status === 'pending_licensee_signature' && !isLicensor) && (
                          <div className="border-t pt-4">
                            <Button data-testid={`button-sign-licensee-${license.id}`}>
                              <FileSignature className="w-4 h-4 mr-2" />
                              Sign as Licensee
                            </Button>
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
    </div>
  );
}

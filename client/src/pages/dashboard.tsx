import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RegistrationStrength } from "@shared/registration-strength";
import { Shield, Upload, Image as ImageIcon, Loader2, Gift, Sparkles, AlertCircle, Key, ExternalLink, User, Building2, FileText, CheckCircle2, Clock, XCircle, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Logo, Collection } from "@shared/schema";
import { Link } from "wouter";
import { NFTMintingUI } from "@/components/nft-minting-ui";

function getExplorerUrl(chain: string, address: string): { url: string; name: string } {
  switch (chain) {
    case 'solana':
      return { url: `https://solscan.io/token/${address}`, name: 'Solscan' };
    case 'ethereum':
      return { url: `https://etherscan.io/token/${address}`, name: 'Etherscan' };
    case 'base':
      return { url: `https://basescan.org/token/${address}`, name: 'BaseScan' };
    case 'arbitrum':
      return { url: `https://arbiscan.io/token/${address}`, name: 'Arbiscan' };
    case 'polygon':
      return { url: `https://polygonscan.com/token/${address}`, name: 'PolygonScan' };
    default:
      return { url: `https://solscan.io/token/${address}`, name: 'Explorer' };
  }
}

function StrengthBar({ percentage, tier }: { percentage: number; tier: string }) {
  const color = tier === 'verified' ? 'bg-green-500' : tier === 'strong' ? 'bg-blue-500' : tier === 'basic' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function TokenVerificationCard({ logoId }: { logoId: string }) {
  const { toast } = useToast();

  const { data: verificationData, isLoading } = useQuery<{
    status: 'verified' | 'pending' | 'expired';
    tickerVerified: boolean;
    tickerVerificationDeadline: string | null;
    isExpired: boolean;
    timeRemaining: number;
    botVerificationStatus: string;
    registrationStrength: RegistrationStrength;
    rewardsBlocked: boolean;
    rewardsBlockedReason: string | null;
  }>({
    queryKey: ['/api/logos', logoId, 'verification-status'],
    refetchInterval: 60000,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/logos/${logoId}/confirm-verification`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos', logoId, 'verification-status'] });
      toast({
        title: "Verification Confirmed",
        description: `Rewards unlocked! ${data.rewards?.tickerVerified?.success ? 'Ticker verification reward earned.' : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/logos/${logoId}/restart-verification`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos', logoId, 'verification-status'] });
      toast({ title: "Verification Restarted", description: "You have a new 24-hour window to complete verification." });
    },
    onError: (error: Error) => {
      toast({ title: "Restart Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !verificationData) {
    return (
      <div className="pt-2 border-t space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading verification status...
        </div>
      </div>
    );
  }

  const { status, registrationStrength: strength, rewardsBlocked, timeRemaining } = verificationData;

  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="pt-2 border-t space-y-3" data-testid={`verification-card-${logoId}`}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium">Registration Strength</span>
          <Badge
            variant={strength.tier === 'verified' ? 'default' : strength.tier === 'strong' ? 'default' : 'secondary'}
            className={`text-xs ${strength.tier === 'verified' ? 'bg-green-600' : strength.tier === 'strong' ? 'bg-blue-600' : ''}`}
            data-testid={`badge-strength-${logoId}`}
          >
            {strength.tierLabel} ({strength.percentage}%)
          </Badge>
        </div>
        <StrengthBar percentage={strength.percentage} tier={strength.tier} />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium">Ticker Verification</span>
        {status === 'verified' ? (
          <Badge className="text-xs bg-green-600" data-testid={`badge-verified-${logoId}`}>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        ) : status === 'expired' ? (
          <Badge variant="destructive" className="text-xs" data-testid={`badge-expired-${logoId}`}>
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs" data-testid={`badge-pending-${logoId}`}>
            <Clock className="w-3 h-3 mr-1" />
            {hoursRemaining}h {minutesRemaining}m left
          </Badge>
        )}
      </div>

      {rewardsBlocked && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
          <Lock className="w-3 h-3 shrink-0" />
          <span>Rewards locked until verification is complete</span>
        </div>
      )}

      {status === 'pending' && (
        <Button
          variant="default"
          size="sm"
          className="w-full text-xs"
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending}
          data-testid={`button-confirm-verification-${logoId}`}
        >
          {confirmMutation.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          )}
          Confirm Verification
        </Button>
      )}

      {status === 'expired' && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => restartMutation.mutate()}
          disabled={restartMutation.isPending}
          data-testid={`button-restart-verification-${logoId}`}
        >
          {restartMutation.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          Restart 24h Verification
        </Button>
      )}

      {status === 'verified' && strength.tier !== 'verified' && strength.missingFields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: Add {strength.missingFields.length} more field{strength.missingFields.length > 1 ? 's' : ''} to strengthen your registration.
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedLogoForMinting, setSelectedLogoForMinting] = useState<Logo | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "Dashboard - Solturio";
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalLogos: number;
    mintedCollections: number;
    pendingLogos: number;
  }>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  const { data: recentCollections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
  });

  const { data: pricingStatus } = useQuery<{
    logoCount: number;
    freeUploadsRemaining: number;
    isEligibleForFreeUpload: boolean;
    freeUploadLimit: number;
    promotion: { active: boolean; message: string };
  }>({
    queryKey: ["/api/pricing/status"],
    enabled: isAuthenticated,
  });

  const { data: logos = [], isLoading: logosLoading } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="h-20 flex items-center px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Light Mode Logo - Dark colored logo for light backgrounds */}
              <img 
                src="/solturio-logo-light-mode.png"
                alt="Solturio Logo for Light Mode"
                className="w-14 h-14 object-contain dark:hidden"
              />
              {/* Dark Mode Logo - White colored logo for dark backgrounds */}
              <img 
                src="/solturio-logo-dark-mode.png"
                alt="Solturio Logo for Dark Mode"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Solturio
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild data-testid="link-account-settings">
                <Link href="/account">Account</Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </span>
                </div>
                <span className="text-sm hidden md:block">
                  {user?.firstName || user?.email}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild data-testid="button-logout">
                <a href="/api/logout">Sign Out</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Protect your brand assets on the blockchain
          </p>
        </div>

        {/* Wallet Setup Prompts */}
        {!user?.emailVerified && (
          <Alert className="mb-6" data-testid="alert-verify-email">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email Verification Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Verify your email to unlock wallet generation and full platform access.</span>
              <Button size="sm" asChild>
                <Link href="/account">Verify Email</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {user?.emailVerified && !user?.solanaPublicKey && (
          <Alert className="mb-6" data-testid="alert-generate-wallet">
            <Key className="h-4 w-4" />
            <AlertTitle>Generate Your Solturio Wallet</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Create your Solturio wallet to hold your logo NFTs. You can import it into Phantom anytime.</span>
              <Button size="sm" asChild>
                <Link href="/account">Generate Wallet</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Launch Promotion Banner */}
        {pricingStatus?.isEligibleForFreeUpload && (
          <Card className="p-6 mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20" data-testid="promotion-banner">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">Launch Special</h3>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    Limited Time
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">
                  {pricingStatus.promotion.message}
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-2xl font-bold text-primary" data-testid="text-free-uploads-remaining">
                      {pricingStatus.freeUploadsRemaining}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">free uploads remaining</span>
                  </div>
                  <Button asChild data-testid="button-upload-now">
                    <Link href="/upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Now
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Logos</span>
              <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
            </div>
            {statsLoading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-4xl font-bold" data-testid="stat-total-logos">
                {stats?.totalLogos || 0}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Minted Collections</span>
              <Shield className="w-8 h-8 text-muted-foreground/30" />
            </div>
            {statsLoading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-4xl font-bold" data-testid="stat-minted-collections">
                {stats?.mintedCollections || 0}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Upload className="w-8 h-8 text-muted-foreground/30" />
            </div>
            {statsLoading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-4xl font-bold" data-testid="stat-pending">
                {stats?.pendingLogos || 0}
              </div>
            )}
          </Card>
        </div>

        {/* Partnership & Outreach Section */}
        <Card className="p-6 mb-8 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Partnership & Outreach</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download professional proposals for DEXs and the Solana Foundation to help spread Solturio
              </p>
              <Button asChild variant="outline" size="sm" data-testid="button-partnerships">
                <Link href="/partnerships">
                  <FileText className="w-4 h-4 mr-2" />
                  Access Partnership Materials
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/upload" data-testid="link-upload-logos">
              <Card className="p-6 hover-elevate cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Upload New Logos</h3>
                    <p className="text-sm text-muted-foreground">
                      Start protecting your brand assets
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/collections" data-testid="link-view-collections">
              <Card className="p-6 hover-elevate cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">View Collections</h3>
                    <p className="text-sm text-muted-foreground">
                      Access your minted NFT records
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/authorized-usage" data-testid="link-authorized-usage">
              <Card className="p-6 hover-elevate cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Authorized Usage</h3>
                    <p className="text-sm text-muted-foreground">
                      Track official logo placements
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/account" data-testid="link-account">
              <Card className="p-6 hover-elevate cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Account Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your profile and wallet
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recently Uploaded Logos - Last 24 Hours Only */}
        {(() => {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentLogos = logos.filter(logo => 
            logo.createdAt && new Date(logo.createdAt) >= twentyFourHoursAgo
          );
          
          if (recentLogos.length === 0) return null;
          
          return (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Recent Uploads</h2>
                <p className="text-sm text-muted-foreground">Last 24 hours</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/collections">View All</Link>
              </Button>
            </div>

            {logosLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentLogos.slice(0, 6).map((logo) => (
                  <Card key={logo.id} className="overflow-hidden" data-testid={`logo-card-${logo.id}`}>
                    <div className="aspect-square bg-muted flex items-center justify-center p-8">
                      {logo.imageUrl ? (
                        <img
                          src={logo.imageUrl}
                          alt={logo.fileName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold mb-1 truncate" title={logo.fileName}>
                          {logo.fileName}
                        </h3>
                        {logo.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {logo.description}
                          </p>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Dimensions</span>
                          <span className="font-medium">{logo.width} × {logo.height}px</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Format</span>
                          <span className="font-medium">{logo.format}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Size</span>
                          <span className="font-medium">{(logo.fileSize / 1024).toFixed(1)}KB</span>
                        </div>
                        {logo.dominantColor && (
                          <div>
                            <span className="text-muted-foreground block">Dominant Color</span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: logo.dominantColor }}
                              />
                              <span className="font-mono text-xs">{logo.dominantColor}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Color Palette */}
                      {logo.colorPalette && logo.colorPalette.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-2">Color Palette</span>
                          <div className="flex gap-1">
                            {logo.colorPalette.slice(0, 5).map((color, i) => (
                              <div
                                key={i}
                                className="w-8 h-8 rounded border"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hash */}
                      {logo.fileHash && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">SHA-256</span>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate" title={logo.fileHash}>
                            {logo.fileHash.slice(0, 16)}...
                          </code>
                        </div>
                      )}

                      {/* Contract Address Status - Token Registrations Only */}
                      {logo.registrationType === 'token_launch' && (
                        <div className="pt-2 border-t">
                          {(logo as any).tokenContractAddress ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">CA Bound</Badge>
                                <span className="text-xs text-muted-foreground">{(logo as any).tokenContractChain || 'solana'}</span>
                              </div>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate" title={(logo as any).tokenContractAddress}>
                                {(logo as any).tokenContractAddress?.slice(0, 12)}...
                              </code>
                              {(() => {
                                const explorer = getExplorerUrl(
                                  (logo as any).tokenContractChain || 'solana',
                                  (logo as any).tokenContractAddress
                                );
                                return (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full text-xs gap-1"
                                    onClick={() => window.open(explorer.url, '_blank')}
                                    data-testid={`button-explorer-${logo.id}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View on {explorer.name}
                                  </Button>
                                );
                              })()}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs"
                                onClick={() => window.open(`/api/logos/${logo.id}/download-verified`, '_blank')}
                                data-testid={`button-download-verified-${logo.id}`}
                              >
                                Download Verification Manifest
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Badge variant="secondary" className="text-xs">Pre-launch: No CA</Badge>
                              <p className="text-xs text-muted-foreground">
                                Add contract address after deployment to create a verification record.
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs"
                                asChild
                                data-testid={`button-bind-ca-${logo.id}`}
                              >
                                <Link href={`/bind-contract/${logo.id}`}>
                                  Bind Contract Address
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verification Status & Registration Strength - Token Launches */}
                      {logo.registrationType === 'token_launch' && (
                        <TokenVerificationCard logoId={logo.id} />
                      )}

                      {/* NFT Status & Mint Button */}
                      <div className="space-y-2">
                        {logo.nftAddress ? (
                          <>
                            <Badge variant="default" className="w-full justify-center">
                              Minted as NFT
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => window.open(`https://solscan.io/token/${logo.nftAddress}`, '_blank')}
                              data-testid={`button-view-nft-${logo.id}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Certificate
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary" className="w-full justify-center">
                              Pending Mint
                            </Badge>
                            <Button 
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => setSelectedLogoForMinting(logo)}
                              data-testid={`button-mint-nft-${logo.id}`}
                            >
                              <Sparkles className="w-4 h-4" />
                              Mint Certificate
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* NFT Minting Section */}
        {selectedLogoForMinting && (
          <div className="mb-12 p-6 border rounded-lg bg-primary/5" data-testid="nft-minting-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Mint IP Protection Certificate</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedLogoForMinting(null)}
                data-testid="button-close-minting"
              >
                ✕
              </Button>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Selected Logo Info */}
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Selected Logo</h3>
                    {selectedLogoForMinting.fileName && (
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-4">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Filename</p>
                      <p className="font-medium">{selectedLogoForMinting.fileName}</p>
                    </div>
                    {selectedLogoForMinting.registrationType && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Type</p>
                        <Badge variant="outline">
                          {selectedLogoForMinting.registrationType === 'token_launch' ? 'Token Launch' : selectedLogoForMinting.registrationType === 'artwork' ? 'Artwork' : 'Logo'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
              
              {/* Minting UI */}
              <div>
                <NFTMintingUI
                  logoId={selectedLogoForMinting.id}
                  logoName={selectedLogoForMinting.fileName}
                  logoDescription={selectedLogoForMinting.description || ''}
                  registrationType={(selectedLogoForMinting.registrationType as any) || 'logo'}
                  alreadyMinted={!!selectedLogoForMinting.nftAddress}
                  nftAddress={selectedLogoForMinting.nftAddress || undefined}
                  explorerUrl={selectedLogoForMinting.nftAddress ? `https://solscan.io/token/${selectedLogoForMinting.nftAddress}` : undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Collections */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Recent Collections</h2>
            {recentCollections.length > 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/collections">View All</Link>
              </Button>
            )}
          </div>

          {collectionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : recentCollections.length === 0 ? (
            <Card className="p-12 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No collections yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload your first logos to get started
              </p>
              <Button asChild data-testid="button-upload-first">
                <Link href="/upload">Upload Logos</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentCollections.slice(0, 5).map((collection) => (
                <Card key={collection.id} className="p-4 hover-elevate">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1" data-testid={`collection-name-${collection.id}`}>
                        {collection.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {collection.companyName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex px-3 py-1 rounded-full text-xs font-medium mb-1"
                           style={{
                             backgroundColor: collection.status === 'minted' ? 'hsl(var(--primary) / 0.1)' : 
                                            collection.status === 'pending' ? 'hsl(var(--muted))' : 
                                            'hsl(var(--accent))',
                             color: collection.status === 'minted' ? 'hsl(var(--primary))' : 
                                   'hsl(var(--foreground))'
                           }}
                           data-testid={`collection-status-${collection.id}`}>
                        {collection.status}
                      </div>
                      {collection.mintedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(collection.mintedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

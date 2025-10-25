import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Shield, Upload, Image as ImageIcon, Loader2, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Logo, Collection } from "@shared/schema";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = "Dashboard - Centurio";
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
      <header className="border-b h-16 flex items-center px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold">Centurio</span>
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
          </div>
        </div>

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

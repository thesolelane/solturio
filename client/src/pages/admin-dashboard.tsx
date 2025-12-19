import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  FileText, 
  Building2, 
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  Settings,
  Lock,
  Globe,
  Rocket,
  Wallet,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";

const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

interface AdminStats {
  totalUsers: number;
  logosProtected: number;
  mintedCollections: number;
  usersWithWallets: number;
  partnerDexs: number;
  pendingDexs: number;
}

interface WalletBalances {
  arweave: {
    balance: string | null;
    address: string | null;
    unit: string;
  };
  solana: {
    balance: string | null;
    address: string | null;
    unit: string;
    network: string;
  };
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    document.title = "Admin Dashboard - Solturio";
  }, []);

  const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isAdmin,
  });

  const { data: walletBalances, isLoading: walletsLoading, refetch: refetchWallets } = useQuery<WalletBalances>({
    queryKey: ['/api/admin/wallets'],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.email) {
      const adminAccess = ADMIN_EMAILS.includes(user.email.toLowerCase());
      setIsAdmin(adminAccess);
      
      if (!adminAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    } else if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the admin dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  const handleRefreshAll = () => {
    refetchStats();
    refetchWallets();
    toast({
      title: "Refreshing data",
      description: "Fetching latest stats and wallet balances...",
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <Lock className="w-8 h-8 text-destructive mx-auto mb-2" />
            <CardTitle className="text-center">Access Restricted</CardTitle>
            <CardDescription className="text-center">
              This area is restricted to Solturio administrators only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Solturio platform administration and business tools
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshAll} data-testid="button-refresh-all">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Badge variant="default" className="px-4 py-2">
              <Shield className="w-4 h-4 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {statsLoading ? "..." : adminStats?.totalUsers ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {adminStats?.usersWithWallets ?? 0} with wallets
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Package className="w-4 h-4" />
              Logos Protected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-logos-protected">
              {statsLoading ? "..." : adminStats?.logosProtected ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {adminStats?.mintedCollections ?? 0} collections minted
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              Partner DEXs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-partner-dexs">
              {statsLoading ? "..." : adminStats?.partnerDexs ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {adminStats?.pendingDexs ?? 0} pending
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              Users with Wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-users-with-wallets">
              {statsLoading ? "..." : adminStats?.usersWithWallets ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              .solturio.sol domains
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balances Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SOL</span>
              </div>
              Solana Treasury
            </CardTitle>
            <CardDescription>
              Platform operations wallet for transaction fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {walletsLoading ? (
              <div className="animate-pulse h-16 bg-muted rounded"></div>
            ) : walletBalances?.solana?.address ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" data-testid="text-sol-balance">
                    {walletBalances.solana.balance ?? "0"}
                  </span>
                  <span className="text-muted-foreground">SOL</span>
                  <Badge variant="secondary" className="ml-2">
                    {walletBalances.solana.network}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {walletBalances.solana.address}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://explorer.solana.com/address/${walletBalances.solana.address}?cluster=${walletBalances.solana.network}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View on Explorer
                  </a>
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">No treasury wallet configured</p>
                <p className="text-xs text-muted-foreground">
                  A SOL treasury wallet is needed for on-chain transactions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">AR</span>
              </div>
              Arweave Storage
            </CardTitle>
            <CardDescription>
              Permanent storage for verified badge images
            </CardDescription>
          </CardHeader>
          <CardContent>
            {walletsLoading ? (
              <div className="animate-pulse h-16 bg-muted rounded"></div>
            ) : walletBalances?.arweave?.address ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" data-testid="text-ar-balance">
                    {walletBalances.arweave.balance ?? "0"}
                  </span>
                  <span className="text-muted-foreground">AR</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {walletBalances.arweave.address}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://viewblock.io/arweave/address/${walletBalances.arweave.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View on ViewBlock
                  </a>
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">No Arweave wallet configured</p>
                <p className="text-xs text-muted-foreground">
                  Add ARWEAVE_WALLET_KEY to enable permanent storage
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Tools Tabs */}
      <Tabs defaultValue="treasury" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="treasury" data-testid="tab-treasury">Treasury</TabsTrigger>
          <TabsTrigger value="partnerships" data-testid="tab-partnerships">Partnerships</TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">Operations</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="treasury" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Fund SOL Treasury
                </CardTitle>
                <CardDescription>
                  Add SOL to the platform treasury for transaction fees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  SOL is required for Solana blockchain transactions including NFT minting and wallet creation.
                </p>
                <Button size="sm" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Fund Arweave Wallet
                </CardTitle>
                <CardDescription>
                  Add AR for permanent image storage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  AR is used for permanent badge image storage. Each image costs approximately 0.0001 AR.
                </p>
                {walletBalances?.arweave?.address && (
                  <Button size="sm" variant="outline" asChild>
                    <a 
                      href={`https://arweave.app/wallet?address=${walletBalances.arweave.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Fund via Arweave.app
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Revenue Tracking
                </CardTitle>
                <CardDescription>
                  Track platform revenue from IP registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor $CATH token payments for IP registrations and SOL for wallet creation.
                </p>
                <Button size="sm" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  View all platform transaction history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete history of wallet creations, mints, and storage uploads.
                </p>
                <Button size="sm" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="partnerships" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = "/admin/partnerships"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Partnership Proposals
                </CardTitle>
                <CardDescription>
                  Generate and manage partnership proposals for DEXs and Solana Foundation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active proposals</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Button size="sm">Manage</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  DEX Outreach
                </CardTitle>
                <CardDescription>
                  Track and manage DEX platform integration campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Platforms reached</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Button size="sm" disabled>Coming Soon</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Token Creator Campaigns
                </CardTitle>
                <CardDescription>
                  Manage marketing campaigns and token creator partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active campaigns</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Button size="sm" disabled>Coming Soon</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Partner Contacts
                </CardTitle>
                <CardDescription>
                  CRM for managing partner relationships and communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total contacts</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Button size="sm" disabled>Coming Soon</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage platform users, wallets, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full" disabled>Coming Soon</Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  IP Claims
                </CardTitle>
                <CardDescription>
                  Review and process intellectual property claims and disputes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/admin/claims">View Claims</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Logo Registry
                </CardTitle>
                <CardDescription>
                  Manage the global logo registry and verification statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full" disabled>Coming Soon</Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Payment Management
                </CardTitle>
                <CardDescription>
                  Track crypto payments, refunds, and financial reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full" disabled>Coming Soon</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                Coming soon: Real-time metrics and business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Analytics dashboard will be available here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Admin Settings
              </CardTitle>
              <CardDescription>
                Configure platform settings and admin permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Admin Email Whitelist</h3>
                <div className="space-y-1">
                  {ADMIN_EMAILS.map((email) => (
                    <div key={email} className="flex items-center gap-2">
                      <Badge variant="secondary">{email}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full" disabled>
                Manage Admin Access (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <Users className="w-4 h-4 mr-1" />
              User Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/partnerships">
              <FileText className="w-4 h-4 mr-1" />
              Generate Proposal
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled>
            <TrendingUp className="w-4 h-4 mr-1" />
            Export Reports
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Shield className="w-4 h-4 mr-1" />
            Security Audit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

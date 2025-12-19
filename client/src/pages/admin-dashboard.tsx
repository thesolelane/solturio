import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  ExternalLink,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2
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

interface TreasuryWallet {
  id: string;
  role: 'funds' | 'rewards' | 'escrow' | 'bank';
  name: string;
  address: string;
  domainName?: string;
  purpose?: string;
  network: string;
  status: string;
  sweepEnabled: boolean;
  sweepThreshold?: string;
  sweepSchedule?: string;
  sweepDestination?: string;
  cachedBalance?: string;
  lastBalanceCheck?: string;
  requiredSignatures: number;
  authorizedSigners?: string[];
}

interface ComplianceTriggerRule {
  id: string;
  triggerCode: string;
  name: string;
  description?: string;
  category: string;
  thresholdValue?: string;
  thresholdPeriodDays?: number;
  thresholdCount?: number;
  requiredTier: string;
  requiresDocuments: boolean;
  requiresManualReview: boolean;
  severity: string;
  isActive: boolean;
}

interface ComplianceCase {
  id: string;
  caseNumber: string;
  userId: string;
  caseType: string;
  status: string;
  priority: string;
  triggersActivated?: string[];
  totalAmount?: string;
  decision?: string;
  createdAt: string;
}

const WALLET_ROLE_CONFIG = {
  funds: { label: "Platform Operations", color: "bg-blue-500", description: "Transaction fees and platform operations" },
  rewards: { label: "User Rewards", color: "bg-green-500", description: "Quiz rewards and user incentives" },
  escrow: { label: "Escrow Payments", color: "bg-amber-500", description: "License payments and dispute resolution" },
  bank: { label: "Company Treasury", color: "bg-purple-500", description: "Final destination for platform revenue" },
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [newWallet, setNewWallet] = useState({
    role: 'funds' as 'funds' | 'rewards' | 'escrow' | 'bank',
    name: '',
    address: '',
    domainName: '',
    purpose: '',
    network: 'devnet',
  });

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

  const { data: treasuryWallets, isLoading: treasuryLoading, refetch: refetchTreasury } = useQuery<TreasuryWallet[]>({
    queryKey: ['/api/admin/treasury/wallets'],
    enabled: isAdmin,
  });

  const { data: triggerRules, refetch: refetchTriggers } = useQuery<ComplianceTriggerRule[]>({
    queryKey: ['/api/admin/compliance/triggers'],
    enabled: isAdmin,
  });

  const { data: complianceCases, refetch: refetchCases } = useQuery<ComplianceCase[]>({
    queryKey: ['/api/admin/compliance/cases'],
    enabled: isAdmin,
  });

  const addWalletMutation = useMutation({
    mutationFn: async (wallet: typeof newWallet) => {
      return apiRequest('/api/admin/treasury/wallets', {
        method: 'POST',
        body: JSON.stringify(wallet),
      });
    },
    onSuccess: () => {
      toast({ title: "Wallet Added", description: "Treasury wallet has been registered successfully" });
      setAddWalletOpen(false);
      setNewWallet({ role: 'funds', name: '', address: '', domainName: '', purpose: '', network: 'devnet' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/treasury/wallets'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Add Wallet", description: error.message || "An error occurred", variant: "destructive" });
    }
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/treasury/wallets/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: "Wallet Removed", description: "Treasury wallet has been removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/treasury/wallets'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Remove Wallet", description: error.message, variant: "destructive" });
    }
  });

  const seedTriggersMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/compliance/seed-triggers', { method: 'POST' });
    },
    onSuccess: (data: any) => {
      toast({ title: "Triggers Seeded", description: data.message || "Default compliance triggers have been created" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/compliance/triggers'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Seed Triggers", description: error.message, variant: "destructive" });
    }
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
    refetchTreasury();
    refetchTriggers();
    refetchCases();
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
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="treasury" data-testid="tab-treasury">Treasury</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          <TabsTrigger value="partnerships" data-testid="tab-partnerships">Partnerships</TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">Operations</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="treasury" className="space-y-4">
          {/* Treasury Wallets Section */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Treasury Wallets</h3>
              <p className="text-sm text-muted-foreground">Manage platform treasury and fund routing</p>
            </div>
            <Dialog open={addWalletOpen} onOpenChange={setAddWalletOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-treasury-wallet">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Treasury Wallet</DialogTitle>
                  <DialogDescription>Register a new wallet for platform treasury management</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Wallet Role</Label>
                    <Select value={newWallet.role} onValueChange={(v) => setNewWallet({...newWallet, role: v as any})}>
                      <SelectTrigger data-testid="select-wallet-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="funds">Platform Operations (funds.solturio.sol)</SelectItem>
                        <SelectItem value="rewards">User Rewards (rewards.solturio.sol)</SelectItem>
                        <SelectItem value="escrow">Escrow Payments (escrow.solturio.sol)</SelectItem>
                        <SelectItem value="bank">Company Treasury (bank.cooperanth.sol)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input 
                      placeholder="e.g., Platform Operations Wallet" 
                      value={newWallet.name}
                      onChange={(e) => setNewWallet({...newWallet, name: e.target.value})}
                      data-testid="input-wallet-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Solana Address</Label>
                    <Input 
                      placeholder="Public key address..." 
                      value={newWallet.address}
                      onChange={(e) => setNewWallet({...newWallet, address: e.target.value})}
                      data-testid="input-wallet-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Domain Name (optional)</Label>
                    <Input 
                      placeholder="e.g., funds.solturio.sol" 
                      value={newWallet.domainName}
                      onChange={(e) => setNewWallet({...newWallet, domainName: e.target.value})}
                      data-testid="input-wallet-domain"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Network</Label>
                    <Select value={newWallet.network} onValueChange={(v) => setNewWallet({...newWallet, network: v})}>
                      <SelectTrigger data-testid="select-wallet-network">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="devnet">Devnet</SelectItem>
                        <SelectItem value="mainnet">Mainnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Input 
                      placeholder="Brief description of wallet purpose..." 
                      value={newWallet.purpose}
                      onChange={(e) => setNewWallet({...newWallet, purpose: e.target.value})}
                      data-testid="input-wallet-purpose"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddWalletOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => addWalletMutation.mutate(newWallet)}
                    disabled={addWalletMutation.isPending || !newWallet.name || !newWallet.address}
                    data-testid="button-confirm-add-wallet"
                  >
                    {addWalletMutation.isPending ? "Adding..." : "Add Wallet"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {treasuryLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading treasury wallets...</div>
          ) : treasuryWallets && treasuryWallets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {treasuryWallets.map((wallet) => {
                const config = WALLET_ROLE_CONFIG[wallet.role];
                return (
                  <Card key={wallet.id} className="hover-elevate" data-testid={`card-treasury-wallet-${wallet.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${config.color}`} />
                          <CardTitle className="text-base">{wallet.name}</CardTitle>
                        </div>
                        <Badge variant={wallet.status === 'active' ? 'default' : 'secondary'}>
                          {wallet.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {config.label} - {wallet.network}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-2xl font-bold">
                          {wallet.cachedBalance || '0.000000'} <span className="text-sm font-normal text-muted-foreground">SOL</span>
                        </div>
                        {wallet.lastBalanceCheck && (
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(wallet.lastBalanceCheck).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-xs font-mono text-muted-foreground truncate">
                        {wallet.address}
                      </div>
                      
                      {wallet.domainName && (
                        <Badge variant="outline" className="text-xs">{wallet.domainName}</Badge>
                      )}

                      <div className="flex items-center gap-2 flex-wrap pt-2">
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://explorer.solana.com/address/${wallet.address}${wallet.network === 'devnet' ? '?cluster=devnet' : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Explorer
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove "${wallet.name}"?`)) {
                              deleteWalletMutation.mutate(wallet.id);
                            }
                          }}
                          data-testid={`button-delete-wallet-${wallet.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-medium mb-2">No Treasury Wallets Configured</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first treasury wallet to start managing platform funds.
                </p>
                <Button onClick={() => setAddWalletOpen(true)} data-testid="button-add-first-wallet">
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Wallet
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Legacy Wallet Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Arweave Storage Wallet
                </CardTitle>
                <CardDescription>
                  Permanent badge image storage
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

        {/* New Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">AML/KYC Compliance</h3>
              <p className="text-sm text-muted-foreground">Monitor triggers, cases, and user verification status</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => seedTriggersMutation.mutate()}
              disabled={seedTriggersMutation.isPending}
              data-testid="button-seed-triggers"
            >
              {seedTriggersMutation.isPending ? "Seeding..." : "Seed Default Triggers"}
            </Button>
          </div>

          {/* Compliance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Active Triggers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-triggers">
                  {triggerRules?.filter(r => r.isActive).length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Rules monitoring transactions</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Open Cases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-open-cases">
                  {complianceCases?.filter(c => c.status === 'open' || c.status === 'under_review').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Requiring attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-review">
                  {complianceCases?.filter(c => c.status === 'pending').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting manual review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-resolved-cases">
                  {complianceCases?.filter(c => c.status === 'resolved' || c.status === 'closed').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Cases closed</p>
              </CardContent>
            </Card>
          </div>

          {/* Trigger Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Active Trigger Rules
              </CardTitle>
              <CardDescription>
                Automated compliance triggers based on transaction patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {triggerRules && triggerRules.length > 0 ? (
                <div className="space-y-2">
                  {triggerRules.filter(r => r.isActive).map((rule) => (
                    <div 
                      key={rule.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`trigger-rule-${rule.triggerCode}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{rule.name}</span>
                          <Badge variant={rule.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {rule.requiresDocuments && <Badge variant="outline">Docs Required</Badge>}
                        {rule.requiresManualReview && <Badge variant="outline">Manual Review</Badge>}
                        <span>Tier {rule.requiredTier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trigger rules configured</p>
                  <p className="text-sm mt-2">Click "Seed Default Triggers" to add standard AML/KYC rules</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Compliance Cases
              </CardTitle>
              <CardDescription>
                Active and recent compliance cases requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {complianceCases && complianceCases.length > 0 ? (
                <div className="space-y-2">
                  {complianceCases.slice(0, 10).map((caseItem) => (
                    <div 
                      key={caseItem.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`compliance-case-${caseItem.caseNumber}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{caseItem.caseNumber}</span>
                          <Badge variant={
                            caseItem.status === 'open' ? 'destructive' : 
                            caseItem.status === 'under_review' ? 'default' : 'secondary'
                          }>
                            {caseItem.status}
                          </Badge>
                          <Badge variant={caseItem.priority === 'high' ? 'destructive' : 'outline'}>
                            {caseItem.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {caseItem.caseType} - User: {caseItem.userId.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        {caseItem.totalAmount && (
                          <p className="text-sm font-medium">${caseItem.totalAmount}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(caseItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No compliance cases</p>
                  <p className="text-sm mt-2">Cases will appear here when triggers are activated</p>
                </div>
              )}
            </CardContent>
          </Card>
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

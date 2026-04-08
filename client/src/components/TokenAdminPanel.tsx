import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coins,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Star,
  Zap,
  Users,
} from "lucide-react";

interface AcceptedToken {
  id: string;
  symbol: string;
  name: string;
  mintAddress: string;
  tier: "primary" | "whitelisted" | "community";
  isActive: boolean;
  decimals: number;
  logoUrl?: string;
  addedAt: string;
  addedBy?: string;
  notes?: string;
}

interface TokenApplication {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  mintAddress: string;
  applicantUserId: string;
  applicantEmail?: string;
  reason: string;
  projectUrl?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

interface RewardsPoolInfo {
  totalPool: number;
  distributed: number;
  remaining: number;
  percentUsed: number;
}

interface TokenAdminPanelProps {
  isAdmin: boolean;
}

export function TokenAdminPanel({ isAdmin }: TokenAdminPanelProps) {
  const { toast } = useToast();
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [newToken, setNewToken] = useState({
    symbol: "",
    name: "",
    mintAddress: "",
    tier: "whitelisted" as "primary" | "whitelisted" | "community",
    decimals: 9,
    logoUrl: "",
    notes: "",
  });

  const {
    data: acceptedTokens,
    isLoading: tokensLoading,
    refetch: refetchTokens,
  } = useQuery<AcceptedToken[]>({
    queryKey: ["/api/admin/tokens"],
    enabled: isAdmin,
  });

  const {
    data: tokenApplications,
    isLoading: applicationsLoading,
    refetch: refetchApplications,
  } = useQuery<TokenApplication[]>({
    queryKey: ["/api/admin/tokens/applications"],
    enabled: isAdmin,
  });

  const { data: rewardsPool, refetch: refetchRewardsPool } = useQuery<RewardsPoolInfo>({
    queryKey: ["/api/admin/rewards/pool"],
    enabled: isAdmin,
  });

  const addTokenMutation = useMutation({
    mutationFn: async (token: typeof newToken) => {
      return apiRequest("POST", "/api/admin/tokens", token);
    },
    onMutate: async (newTokenData) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/tokens"] });
      const previousTokens = queryClient.getQueryData<AcceptedToken[]>(["/api/admin/tokens"]);
      const optimisticToken: AcceptedToken = {
        id: `temp-${Date.now()}`,
        symbol: newTokenData.symbol,
        name: newTokenData.name,
        mintAddress: newTokenData.mintAddress,
        tier: newTokenData.tier,
        isActive: true,
        decimals: newTokenData.decimals,
        logoUrl: newTokenData.logoUrl || undefined,
        addedAt: new Date().toISOString(),
        notes: newTokenData.notes || undefined,
      };
      queryClient.setQueryData<AcceptedToken[]>(["/api/admin/tokens"], (old) => [
        ...(old || []),
        optimisticToken,
      ]);
      setAddTokenOpen(false);
      setNewToken({
        symbol: "",
        name: "",
        mintAddress: "",
        tier: "whitelisted",
        decimals: 9,
        logoUrl: "",
        notes: "",
      });
      return { previousTokens };
    },
    onSuccess: () => {
      toast({ title: "Token Added", description: "Token has been added to the registry" });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousTokens) {
        queryClient.setQueryData<AcceptedToken[]>(["/api/admin/tokens"], context.previousTokens);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
    },
  });

  const toggleTokenMutation = useMutation({
    mutationFn: async ({ tokenId, isActive }: { tokenId: string; isActive: boolean }) => {
      return apiRequest("POST", `/api/admin/tokens/${tokenId}/toggle`, { isActive });
    },
    onMutate: async ({ tokenId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/tokens"] });
      const previousTokens = queryClient.getQueryData<AcceptedToken[]>(["/api/admin/tokens"]);
      queryClient.setQueryData<AcceptedToken[]>(
        ["/api/admin/tokens"],
        (old) => old?.map((token) => (token.id === tokenId ? { ...token, isActive } : token)) || []
      );
      return { previousTokens };
    },
    onSuccess: () => {
      toast({ title: "Token Updated", description: "Token status has been updated" });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousTokens) {
        queryClient.setQueryData<AcceptedToken[]>(["/api/admin/tokens"], context.previousTokens);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
    },
  });

  const reviewApplicationMutation = useMutation({
    mutationFn: async ({
      applicationId,
      decision,
      notes,
    }: {
      applicationId: string;
      decision: "approved" | "rejected";
      notes?: string;
    }) => {
      return apiRequest("POST", `/api/admin/tokens/applications/${applicationId}/review`, {
        decision,
        notes,
      });
    },
    onMutate: async ({ applicationId, decision }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/tokens/applications"] });
      const previousApplications = queryClient.getQueryData<TokenApplication[]>([
        "/api/admin/tokens/applications",
      ]);
      queryClient.setQueryData<TokenApplication[]>(
        ["/api/admin/tokens/applications"],
        (old) =>
          old?.map((app) => (app.id === applicationId ? { ...app, status: decision } : app)) || []
      );
      return { previousApplications };
    },
    onSuccess: (_data, { decision }) => {
      toast({
        title: "Application Reviewed",
        description: `Token application has been ${decision}`,
      });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousApplications) {
        queryClient.setQueryData<TokenApplication[]>(
          ["/api/admin/tokens/applications"],
          context.previousApplications
        );
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
    },
  });

  const seedTokensMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/tokens/seed");
    },
    onSuccess: () => {
      toast({
        title: "Tokens Seeded",
        description: "Default tokens have been added to the registry",
      });
      refetchTokens();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "primary":
        return (
          <Badge className="bg-amber-500">
            <Star className="w-3 h-3 mr-1" />
            Primary
          </Badge>
        );
      case "whitelisted":
        return (
          <Badge className="bg-blue-500">
            <Zap className="w-3 h-3 mr-1" />
            Whitelisted
          </Badge>
        );
      case "community":
        return (
          <Badge className="bg-purple-500">
            <Users className="w-3 h-3 mr-1" />
            Community
          </Badge>
        );
      default:
        return <Badge variant="secondary">{tier}</Badge>;
    }
  };

  const pendingApplications = tokenApplications?.filter((a) => a.status === "pending") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Token Registry</h3>
          <p className="text-sm text-muted-foreground">
            Manage accepted payment tokens and $SOLT rewards
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => seedTokensMutation.mutate()}
            disabled={seedTokensMutation.isPending}
            data-testid="button-seed-tokens"
          >
            {seedTokensMutation.isPending ? "Seeding..." : "Seed Defaults"}
          </Button>
          <Dialog open={addTokenOpen} onOpenChange={setAddTokenOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-token">
                <Plus className="w-4 h-4 mr-1" />
                Add Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Accepted Token</DialogTitle>
                <DialogDescription>Add a new token to the payment registry</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input
                      placeholder="e.g., BONK"
                      value={newToken.symbol}
                      onChange={(e) =>
                        setNewToken({ ...newToken, symbol: e.target.value.toUpperCase() })
                      }
                      data-testid="input-token-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g., Bonk"
                      value={newToken.name}
                      onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                      data-testid="input-token-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mint Address</Label>
                  <Input
                    placeholder="Solana token mint address"
                    value={newToken.mintAddress}
                    onChange={(e) => setNewToken({ ...newToken, mintAddress: e.target.value })}
                    data-testid="input-token-mint"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select
                      value={newToken.tier}
                      onValueChange={(v) => setNewToken({ ...newToken, tier: v as any })}
                    >
                      <SelectTrigger data-testid="select-token-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary (Core tokens)</SelectItem>
                        <SelectItem value="whitelisted">Whitelisted (Admin approved)</SelectItem>
                        <SelectItem value="community">Community (User requested)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Decimals</Label>
                    <Input
                      type="number"
                      value={newToken.decimals}
                      onChange={(e) =>
                        setNewToken({ ...newToken, decimals: parseInt(e.target.value) || 9 })
                      }
                      data-testid="input-token-decimals"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo URL (optional)</Label>
                  <Input
                    placeholder="https://..."
                    value={newToken.logoUrl}
                    onChange={(e) => setNewToken({ ...newToken, logoUrl: e.target.value })}
                    data-testid="input-token-logo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Admin notes about this token"
                    value={newToken.notes}
                    onChange={(e) => setNewToken({ ...newToken, notes: e.target.value })}
                    data-testid="input-token-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddTokenOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addTokenMutation.mutate(newToken)}
                  disabled={
                    !newToken.symbol ||
                    !newToken.name ||
                    !newToken.mintAddress ||
                    addTokenMutation.isPending
                  }
                  data-testid="button-confirm-add-token"
                >
                  {addTokenMutation.isPending ? "Adding..." : "Add Token"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rewards Pool Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Coins className="w-4 h-4" />
              Total $SOLT Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pool">
              {rewardsPool?.totalPool?.toLocaleString() ?? "50,000,000"}
            </div>
            <p className="text-xs text-muted-foreground">Utility rewards allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Distributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-distributed">
              {rewardsPool?.distributed?.toLocaleString() ?? "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {rewardsPool?.percentUsed?.toFixed(2) ?? "0"}% of pool
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-remaining">
              {rewardsPool?.remaining?.toLocaleString() ?? "50,000,000"}
            </div>
            <p className="text-xs text-muted-foreground">Available for rewards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Pending Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500" data-testid="text-pending-apps">
              {pendingApplications.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Accepted Tokens List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Accepted Tokens
              </CardTitle>
              <CardDescription>Tokens accepted for platform payments</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchTokens()}
              data-testid="button-refresh-tokens"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tokens...</div>
          ) : !acceptedTokens?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No tokens configured yet</p>
              <Button
                size="sm"
                onClick={() => seedTokensMutation.mutate()}
                disabled={seedTokensMutation.isPending}
              >
                Seed Default Tokens
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {acceptedTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  data-testid={`token-row-${token.symbol}`}
                >
                  <div className="flex items-center gap-3">
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{token.symbol}</span>
                        {getTierBadge(token.tier)}
                        {!token.isActive && <Badge variant="secondary">Disabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{token.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <code className="text-xs text-muted-foreground font-mono">
                      {token.mintAddress.slice(0, 8)}...{token.mintAddress.slice(-6)}
                    </code>
                    {token.tier !== "primary" && (
                      <Switch
                        checked={token.isActive}
                        onCheckedChange={(checked) =>
                          toggleTokenMutation.mutate({ tokenId: token.id, isActive: checked })
                        }
                        data-testid={`switch-token-${token.symbol}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Applications */}
      {pendingApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Token Applications
            </CardTitle>
            <CardDescription>Community token requests awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border bg-card space-y-3"
                  data-testid={`application-${app.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{app.tokenSymbol}</span>
                        <span className="text-muted-foreground">({app.tokenName})</span>
                      </div>
                      <code className="text-xs text-muted-foreground font-mono">
                        {app.mintAddress}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          reviewApplicationMutation.mutate({
                            applicationId: app.id,
                            decision: "rejected",
                          })
                        }
                        disabled={reviewApplicationMutation.isPending}
                        data-testid={`button-reject-${app.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewApplicationMutation.mutate({
                            applicationId: app.id,
                            decision: "approved",
                          })
                        }
                        disabled={reviewApplicationMutation.isPending}
                        data-testid={`button-approve-${app.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">{app.reason}</p>
                    {app.projectUrl && (
                      <a
                        href={app.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {app.projectUrl}
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {new Date(app.submittedAt).toLocaleDateString()} by{" "}
                    {app.applicantEmail || app.applicantUserId}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TokenAdminPanel;

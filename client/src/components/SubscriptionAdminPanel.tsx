import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Gift, 
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Crown,
  TrendingUp,
  Coins,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SubscriptionUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accountStatus: string;
  subscriptionExpiresAt: string | null;
  soltBalance: string | null;
  createdAt: string | null;
}

interface RewardsPoolStats {
  totalPoolAmount: number;
  totalDistributed: number;
  remainingPool: number;
  percentUsed: number;
  currentMultiplier: string;
  multiplierPhase: string;
}

export function SubscriptionAdminPanel() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<SubscriptionUser | null>(null);
  const [manualRewardAmount, setManualRewardAmount] = useState("");
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<SubscriptionUser[]>({
    queryKey: ['/api/admin/subscriptions/users'],
  });

  const { data: rewardsStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<RewardsPoolStats>({
    queryKey: ['/api/admin/tokens/rewards-pool'],
  });

  const grantFreeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', '/api/admin/subscriptions/grant-free', { userId });
      return response.json();
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/subscriptions/users'] });
      const previousUsers = queryClient.getQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users']);
      queryClient.setQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users'], (old) =>
        old?.map((user) => user.id === userId ? { ...user, accountStatus: 'admin' } : user) || []
      );
      return { previousUsers };
    },
    onSuccess: () => {
      toast({ title: "Free access granted", description: "User now has admin/free access to the platform." });
    },
    onError: (error: Error, _userId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users'], context.previousUsers);
      }
      toast({ title: "Failed to grant access", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions/users'] });
    },
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: number }) => {
      const response = await apiRequest('POST', '/api/admin/subscriptions/extend', { userId, days });
      return response.json();
    },
    onMutate: async ({ userId, days }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/subscriptions/users'] });
      const previousUsers = queryClient.getQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users']);
      queryClient.setQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users'], (old) =>
        old?.map((user) => {
          if (user.id === userId) {
            const currentExpiry = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : new Date();
            const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
            return { ...user, subscriptionExpiresAt: newExpiry.toISOString(), accountStatus: 'active' };
          }
          return user;
        }) || []
      );
      return { previousUsers };
    },
    onSuccess: () => {
      toast({ title: "Subscription extended", description: "User's subscription has been extended." });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users'], context.previousUsers);
      }
      toast({ title: "Failed to extend subscription", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions/users'] });
    },
  });

  const awardRewardsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) => {
      const response = await apiRequest('POST', '/api/admin/subscriptions/award-rewards', { userId, amount, reason });
      return response.json();
    },
    onMutate: async ({ userId, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/subscriptions/users'] });
      const previousUsers = queryClient.getQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users']);
      queryClient.setQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users'], (old) =>
        old?.map((user) => {
          if (user.id === userId) {
            const currentBalance = parseFloat(user.soltBalance || '0');
            return { ...user, soltBalance: String(currentBalance + amount) };
          }
          return user;
        }) || []
      );
      setRewardDialogOpen(false);
      setManualRewardAmount("");
      return { previousUsers };
    },
    onSuccess: () => {
      toast({ title: "Rewards awarded", description: "SOLT rewards have been credited to the user." });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData<SubscriptionUser[]>(['/api/admin/subscriptions/users'], context.previousUsers);
      }
      setRewardDialogOpen(false);
      setManualRewardAmount("");
      toast({ title: "Failed to award rewards", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tokens/rewards-pool'] });
    },
  });

  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'expired':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      case 'admin':
        return <Badge className="bg-purple-600"><Crown className="w-3 h-3 mr-1" /> Admin</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => u.accountStatus === 'active' || u.accountStatus === 'admin').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Rewards Pool</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rewardsStats ? `${(rewardsStats.remainingPool / 1_000_000).toFixed(1)}M` : "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rewardsStats ? `${rewardsStats.percentUsed.toFixed(1)}% distributed` : "Loading..."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Current Multiplier</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewardsStats?.currentMultiplier || "..."}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rewardsStats?.multiplierPhase || "Loading..."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>View and manage user subscriptions and rewards</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchUsers()} data-testid="button-refresh-users">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading users...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">SOLT Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.slice(0, 50).map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.accountStatus)}</TableCell>
                      <TableCell className="text-sm">
                        {user.accountStatus === 'admin' ? 'Never' : formatDate(user.subscriptionExpiresAt)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(user.soltBalance || '0').toLocaleString()} SOLT
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => extendSubscriptionMutation.mutate({ userId: user.id, days: 30 })}
                            disabled={extendSubscriptionMutation.isPending}
                            data-testid={`button-extend-${user.id}`}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            +30d
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setRewardDialogOpen(true);
                            }}
                            data-testid={`button-reward-${user.id}`}
                          >
                            <Gift className="w-3 h-3 mr-1" />
                            Reward
                          </Button>
                          {user.accountStatus !== 'admin' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => grantFreeMutation.mutate(user.id)}
                              disabled={grantFreeMutation.isPending}
                              data-testid={`button-grant-admin-${user.id}`}
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              Admin
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredUsers || filteredUsers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award SOLT Rewards</DialogTitle>
            <DialogDescription>
              Manually award SOLT tokens to {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reward-amount">Amount (SOLT)</Label>
              <Input
                id="reward-amount"
                type="number"
                placeholder="Enter amount..."
                value={manualRewardAmount}
                onChange={(e) => setManualRewardAmount(e.target.value)}
                data-testid="input-reward-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser && manualRewardAmount) {
                  awardRewardsMutation.mutate({
                    userId: selectedUser.id,
                    amount: parseFloat(manualRewardAmount),
                    reason: 'admin_manual',
                  });
                }
              }}
              disabled={!manualRewardAmount || awardRewardsMutation.isPending}
              data-testid="button-confirm-reward"
            >
              {awardRewardsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Awarding...
                </>
              ) : (
                "Award Rewards"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

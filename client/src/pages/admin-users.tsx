import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  Lock,
  Wallet,
  Package,
  Crown,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Coins,
  Loader2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  accountStatus: string;
  isAdmin: boolean;
  walletName: string | null;
  solanaPublicKey: string | null;
  ceremonyCompleted: boolean;
  subscriptionTier: string | null;
  subscriptionExpiresAt: string | null;
  sltrBalance: string;
  sltrTotalEarned: string;
  referralCode: string | null;
  referralCount: number;
  twitterHandle: string | null;
  telegramHandle: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  logoCount: number;
  collectionCount: number;
  mintedCount: number;
}

interface UserDetail {
  user: any;
  logos: any[];
  collections: any[];
  stats: {
    totalLogos: number;
    mintedCollections: number;
    totalCollections: number;
  };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Active</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    case 'expired':
      return <Badge variant="outline" className="gap-1"><XCircle className="w-3 h-3" />Expired</Badge>;
    case 'suspended':
      return <Badge variant="destructive" className="gap-1"><Lock className="w-3 h-3" />Suspended</Badge>;
    case 'admin':
      return <Badge variant="default" className="gap-1"><Shield className="w-3 h-3" />Admin</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getUserInitials(user: AdminUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return '?';
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editSubscriptionTier, setEditSubscriptionTier] = useState("");

  useEffect(() => {
    document.title = "User Management - Solturio Admin";
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.email) {
      const adminAccess = ADMIN_EMAILS.includes(user.email.toLowerCase());
      setIsAdmin(adminAccess);
      if (!adminAccess) {
        toast({ title: "Access Denied", description: "Admin access required", variant: "destructive" });
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
      }
    } else if (!authLoading && !isAuthenticated) {
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  const { data: usersData, isLoading: usersLoading, refetch } = useQuery<{
    users: AdminUser[];
    total: number;
    filtered: number;
  }>({
    queryKey: ['/api/admin/users', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ['/api/admin/users', selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch user details');
      return res.json();
    },
    enabled: isAdmin && !!selectedUserId,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}`, updates);
    },
    onSuccess: () => {
      toast({ title: "User Updated", description: "User account has been updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditDialogOpen(false);
      setEditUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const openEditDialog = (u: AdminUser) => {
    setEditUser(u);
    setEditStatus(u.accountStatus || 'pending');
    setEditSubscriptionTier(u.subscriptionTier || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const updates: any = {};
    if (editStatus !== editUser.accountStatus) updates.accountStatus = editStatus;
    if (editSubscriptionTier && editSubscriptionTier !== editUser.subscriptionTier) {
      updates.subscriptionTier = editSubscriptionTier;
    }
    if (Object.keys(updates).length === 0) {
      toast({ title: "No Changes", description: "No changes were made" });
      return;
    }
    updateUserMutation.mutate({ userId: editUser.id, updates });
  };

  const users = usersData?.users || [];

  const statusCounts = {
    active: users.filter(u => u.accountStatus === 'active').length,
    pending: users.filter(u => u.accountStatus === 'pending').length,
    expired: users.filter(u => u.accountStatus === 'expired').length,
    withWallets: users.filter(u => u.walletName).length,
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-users-title">User Management</h1>
          <p className="text-muted-foreground">
            View and manage platform users, subscriptions, and wallets
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-users">
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold" data-testid="text-user-total">{usersData?.total ?? 0}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-user-active">{statusCounts.active}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-user-pending">{statusCounts.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">With Wallets</p>
                <p className="text-2xl font-bold" data-testid="text-user-wallets">{statusCounts.withWallets}</p>
              </div>
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search &amp; Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, wallet, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({usersData?.filtered ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>$SOLT</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">{getUserInitials(u)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {u.firstName || ''} {u.lastName || ''}
                              {u.isAdmin && <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">Admin</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email || 'No email'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(u.accountStatus)}</TableCell>
                      <TableCell>
                        {u.walletName ? (
                          <div>
                            <p className="text-xs font-medium">{u.walletName}</p>
                            {u.ceremonyCompleted && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5">Ceremony Done</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{u.logoCount} IPs</Badge>
                          {u.mintedCount > 0 && (
                            <Badge variant="outline" className="text-xs">{u.mintedCount} minted</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{parseFloat(u.sltrBalance).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedUserId(u.id)}
                            data-testid={`button-view-user-${u.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(u)}
                            data-testid={`button-edit-user-${u.id}`}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>Complete user profile and activity</DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : userDetail ? (
              <Tabs defaultValue="profile" className="mt-2">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="registrations">Registrations ({userDetail.stats.totalLogos})</TabsTrigger>
                  <TabsTrigger value="collections">Collections ({userDetail.stats.totalCollections})</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={userDetail.user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-lg">
                        {userDetail.user.firstName?.[0] || userDetail.user.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {userDetail.user.firstName || ''} {userDetail.user.lastName || ''}
                      </h3>
                      <p className="text-sm text-muted-foreground">{userDetail.user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(userDetail.user.accountStatus)}
                        {userDetail.user.isAdmin && <Badge variant="default"><Shield className="w-3 h-3 mr-1" />Admin</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1"><Wallet className="w-4 h-4" /> Wallet</h4>
                      {userDetail.user.walletName ? (
                        <>
                          <p className="text-sm">{userDetail.user.walletName}</p>
                          {userDetail.user.solanaPublicKey && (
                            <p className="text-xs font-mono text-muted-foreground truncate">{userDetail.user.solanaPublicKey}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {userDetail.user.ceremonyCompleted ? (
                              <Badge variant="outline" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Ceremony Complete</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Ceremony Pending</Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No wallet created</p>
                      )}
                    </div>

                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1"><Crown className="w-4 h-4" /> Subscription</h4>
                      <p className="text-sm capitalize">{userDetail.user.subscriptionTier || 'None'}</p>
                      {userDetail.user.subscriptionExpiresAt && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(new Date(userDetail.user.subscriptionExpiresAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1"><Coins className="w-4 h-4" /> Rewards</h4>
                      <p className="text-sm">Balance: <span className="font-mono font-medium">{parseFloat(userDetail.user.sltrBalance || '0').toLocaleString()}</span> $SOLT</p>
                      <p className="text-xs text-muted-foreground">
                        Total earned: {parseFloat(userDetail.user.sltrTotalEarned || '0').toLocaleString()} $SOLT
                      </p>
                    </div>

                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1"><Users className="w-4 h-4" /> Referrals</h4>
                      <p className="text-sm">Code: <span className="font-mono">{userDetail.user.referralCode || 'None'}</span></p>
                      <p className="text-xs text-muted-foreground">{userDetail.user.referralCount || 0} referrals</p>
                    </div>
                  </div>

                  {(userDetail.user.twitterHandle || userDetail.user.telegramHandle || userDetail.user.websiteUrl) && (
                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="font-medium text-sm">Social</h4>
                      <div className="flex flex-wrap gap-2">
                        {userDetail.user.twitterHandle && (
                          <Badge variant="secondary" className="text-xs">X: {userDetail.user.twitterHandle}</Badge>
                        )}
                        {userDetail.user.telegramHandle && (
                          <Badge variant="secondary" className="text-xs">TG: {userDetail.user.telegramHandle}</Badge>
                        )}
                        {userDetail.user.websiteUrl && (
                          <a href={userDetail.user.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <ExternalLink className="w-3 h-3" />{userDetail.user.websiteUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>User ID: <span className="font-mono">{userDetail.user.id}</span></p>
                    <p>Created: {userDetail.user.createdAt ? format(new Date(userDetail.user.createdAt), 'PPpp') : '-'}</p>
                    <p>Updated: {userDetail.user.updatedAt ? format(new Date(userDetail.user.updatedAt), 'PPpp') : '-'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="registrations" className="mt-4">
                  {userDetail.logos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No registrations</div>
                  ) : (
                    <div className="space-y-2">
                      {userDetail.logos.map((logo: any) => (
                        <div key={logo.id} className="border rounded-md p-3 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{logo.fileName || logo.tokenName || 'Untitled'}</p>
                            <div className="flex items-center gap-2">
                              {logo.registrationType && (
                                <Badge variant="outline" className="text-xs capitalize">{logo.registrationType.replace('_', ' ')}</Badge>
                              )}
                              {logo.tokenTicker && (
                                <Badge variant="secondary" className="text-xs">${logo.tokenTicker}</Badge>
                              )}
                              {logo.tickerVerified && (
                                <Badge variant="default" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>
                              )}
                              {logo.nftAddress && (
                                <Badge variant="default" className="text-xs"><Package className="w-3 h-3 mr-1" />Minted</Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {logo.createdAt ? format(new Date(logo.createdAt), 'MMM d, yyyy') : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="collections" className="mt-4">
                  {userDetail.collections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No collections</div>
                  ) : (
                    <div className="space-y-2">
                      {userDetail.collections.map((col: any) => (
                        <div key={col.id} className="border rounded-md p-3 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{col.name || 'Unnamed Collection'}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={col.status === 'minted' ? 'default' : 'secondary'} className="text-xs capitalize">
                                {col.status}
                              </Badge>
                              {col.collectionAddress && (
                                <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                                  {col.collectionAddress}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {col.createdAt ? format(new Date(col.createdAt), 'MMM d, yyyy') : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      {editDialogOpen && editUser && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update account status and subscription for {editUser.email || editUser.firstName || 'this user'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Account Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select value={editSubscriptionTier} onValueChange={setEditSubscriptionTier}>
                  <SelectTrigger data-testid="select-edit-tier">
                    <SelectValue placeholder="No subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateUserMutation.isPending}
                data-testid="button-save-user-edit"
              >
                {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
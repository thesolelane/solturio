import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Wallet, Mail, Bell, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Link } from "wouter";

export default function AccountPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [walletInput, setWalletInput] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access your account settings.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Link wallet mutation
  const linkWalletMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await fetch("/api/account/link-wallet", {
        method: "POST",
        body: JSON.stringify({ walletAddress }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Wallet Linked",
        description: "Your Solana wallet has been linked successfully.",
      });
      setWalletInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link wallet",
        variant: "destructive",
      });
    },
  });

  // Send verification email mutation
  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/account/send-verification", {
        method: "POST",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: { notifyPaymentsDue: boolean; notifyRentalReminders: boolean }) => {
      const response = await fetch("/api/account/notifications", {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    },
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

  const handleLinkWallet = () => {
    if (!walletInput.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }
    linkWalletMutation.mutate(walletInput);
  };

  const isWalletLinked = !!user?.walletAddress;
  const isEmailVerified = user?.emailVerified || false;
  const canUploadOrPay = isWalletLinked && isEmailVerified;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b h-16 flex items-center px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold">LogoGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="button-logout">
              <a href="/api/logout">Sign Out</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, wallet, and security preferences
          </p>
        </div>

        {/* Account Status Card */}
        <Card className="p-6 mb-6" data-testid="card-account-status">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${canUploadOrPay ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
              {canUploadOrPay ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Account Status</h3>
              {canUploadOrPay ? (
                <p className="text-sm text-muted-foreground">
                  Your account is fully set up. You can upload logos and make payments.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete the setup below to unlock uploads and payments.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant={isEmailVerified ? "default" : "secondary"} data-testid="badge-email-status">
                  {isEmailVerified ? "Email Verified" : "Email Not Verified"}
                </Badge>
                <Badge variant={isWalletLinked ? "default" : "secondary"} data-testid="badge-wallet-status">
                  {isWalletLinked ? "Wallet Connected" : "Wallet Not Connected"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Information */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <div className="text-sm text-muted-foreground mt-1">{user?.email || "No email provided"}</div>
            </div>
            <div>
              <Label>Name</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {user?.firstName || user?.lastName 
                  ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                  : "No name provided"}
              </div>
            </div>
          </div>
        </Card>

        {/* Email Verification */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Email Verification (Security Required)</h3>
              {isEmailVerified ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">Your email is verified</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    As a security measure (similar to 2FA), you must verify your email address before linking a wallet or making payments.
                  </p>
                  <Button 
                    onClick={() => sendVerificationMutation.mutate()}
                    disabled={sendVerificationMutation.isPending}
                    data-testid="button-verify-email"
                  >
                    {sendVerificationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Verification Email"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Wallet Connection */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Solana Wallet</h3>
              {isWalletLinked ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Wallet Connected</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded break-all" data-testid="text-connected-wallet">
                    {user?.walletAddress}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your wallet is ready for payments and NFT minting.
                  </p>
                </>
              ) : (
                <>
                  {!isEmailVerified ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 mb-3">
                      <p className="text-sm text-muted-foreground">
                        ⚠️ You must verify your email first before linking a wallet.
                      </p>
                    </div>
                  ) : null}
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect your Solana wallet (Phantom, Solflare, or Backpack) to upload logos and make payments.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste your Solana wallet address"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      disabled={!isEmailVerified || linkWalletMutation.isPending}
                      data-testid="input-wallet-address"
                    />
                    <Button 
                      onClick={handleLinkWallet}
                      disabled={!isEmailVerified || linkWalletMutation.isPending}
                      data-testid="button-link-wallet"
                    >
                      {linkWalletMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        "Link Wallet"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Future: We'll add wallet adapter for one-click connection with Phantom/Solflare/Backpack
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notify-payments">Payment Due Notices</Label>
                    <p className="text-sm text-muted-foreground">Get notified when payments are due</p>
                  </div>
                  <Switch
                    id="notify-payments"
                    checked={user?.notifyPaymentsDue ?? true}
                    onCheckedChange={(checked) => {
                      updateNotificationsMutation.mutate({
                        notifyPaymentsDue: checked,
                        notifyRentalReminders: user?.notifyRentalReminders ?? true,
                      });
                    }}
                    data-testid="switch-notify-payments"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notify-rentals">Rental Renewal Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about image registry rental renewals</p>
                  </div>
                  <Switch
                    id="notify-rentals"
                    checked={user?.notifyRentalReminders ?? true}
                    onCheckedChange={(checked) => {
                      updateNotificationsMutation.mutate({
                        notifyPaymentsDue: user?.notifyPaymentsDue ?? true,
                        notifyRentalReminders: checked,
                      });
                    }}
                    data-testid="switch-notify-rentals"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

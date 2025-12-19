import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Wallet, Mail, Bell, CheckCircle2, AlertCircle, Loader2, Twitter, Send, MessageSquare, Key, Copy, Download, ExternalLink, Github, Moon, Sun, Palette, Instagram, Users, Globe, FileText } from "lucide-react";
import { GitHubLink } from "@/components/github-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Link } from "wouter";

export default function AccountPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [walletInput, setWalletInput] = useState("");
  const [socialHandles, setSocialHandles] = useState({
    twitterHandle: "",
    telegramHandle: "",
    discordHandle: "",
    instagramHandle: "",
    telegramGroupLink: "",
    websiteUrl: "",
    bio: "",
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportedPrivateKey, setExportedPrivateKey] = useState<number[] | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Set page title
  useEffect(() => {
    document.title = "Account Settings - Solturio";
  }, []);

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

  // Update social handles mutation
  const updateSocialHandlesMutation = useMutation({
    mutationFn: async (data: { twitterHandle?: string; telegramHandle?: string; discordHandle?: string }) => {
      const response = await fetch("/api/account/social-handles", {
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
        title: "Social Handles Updated",
        description: "Your social media handles have been saved.",
      });
    },
  });

  // Generate Solturio wallet mutation
  const generateWalletMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/account/generate-solturio-wallet", {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate wallet");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Wallet Created!",
        description: "Your Solturio wallet has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate wallet",
        variant: "destructive",
      });
    },
  });

  // Export private key mutation
  const exportPrivateKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/account/export-private-key", {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export private key");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setExportedPrivateKey(data.privateKey);
      setShowExportDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to export private key",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadPrivateKey = () => {
    if (!exportedPrivateKey) return;
    const blob = new Blob([JSON.stringify(exportedPrivateKey)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solturio-wallet-private-key.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded",
      description: "Private key saved as JSON file",
    });
  };

  // Sync social handles state from user data
  useEffect(() => {
    if (user) {
      setSocialHandles({
        twitterHandle: user.twitterHandle || "",
        telegramHandle: user.telegramHandle || "",
        discordHandle: user.discordHandle || "",
        instagramHandle: user.instagramHandle || "",
        telegramGroupLink: user.telegramGroupLink || "",
        websiteUrl: user.websiteUrl || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

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
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" asChild data-testid="button-logout">
                <a href="/api/logout">Sign Out</a>
              </Button>
            </div>
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
              <h3 className="text-lg font-semibold mb-2">Email Verification (Required)</h3>
              {isEmailVerified ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">Your email is verified</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Verify your email to unlock wallet generation and payment features.
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

        {/* Solturio Wallet - Auto-generated Solana wallet */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Key className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Solturio Wallet</h3>
                <Badge variant="outline">Auto-Generated</Badge>
              </div>

              <Alert className="mb-4 bg-primary/5 border-primary/20">
                <Key className="h-4 w-4 text-primary" />
                <AlertTitle>Lost Access to Your Wallet?</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span className="text-sm">
                    Recovery service available for $100 + identity verification. Your certificates are safe.
                  </span>
                  <Button size="sm" variant="outline" asChild data-testid="button-wallet-recovery">
                    <Link href="/wallet-recovery">
                      <a href="/wallet-recovery" className="flex items-center gap-2">
                        Recover Wallet
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
              
              {!isEmailVerified ? (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Email Verification Required</AlertTitle>
                  <AlertDescription>
                    You must verify your email before we can generate your Solturio wallet.
                  </AlertDescription>
                </Alert>
              ) : user?.solanaPublicKey ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Wallet Generated</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Public Key (Wallet Address)</Label>
                      <div className="flex gap-2 mt-1">
                        <div className="flex-1 text-sm font-mono bg-muted p-2 rounded break-all" data-testid="text-solturio-wallet">
                          {user.solanaPublicKey}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copyToClipboard(user.solanaPublicKey!, "Wallet address")}
                          data-testid="button-copy-wallet"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 space-y-2">
                      <p className="text-sm font-medium">Import to Phantom Wallet</p>
                      <p className="text-xs text-muted-foreground">
                        Your NFTs will be minted to this address. Export the private key below to import into Phantom and manage your NFTs directly.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => exportPrivateKeyMutation.mutate()}
                          disabled={exportPrivateKeyMutation.isPending}
                          data-testid="button-export-private-key"
                        >
                          {exportPrivateKeyMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Export Private Key
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Get Phantom
                          </a>
                        </Button>
                      </div>
                    </div>

                    {user.hasExportedPrivateKey && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Private Key Exported</AlertTitle>
                        <AlertDescription>
                          You've already exported your private key. Keep it safe!
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    We'll create a secure Solana wallet for you to hold your logo NFTs. You can export the private key to import into Phantom wallet anytime.
                  </p>
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Why Solturio Wallet?</AlertTitle>
                    <AlertDescription>
                      This makes it easy to get started with crypto. Your NFTs are minted to this wallet, and you can later import it into Phantom for full control.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => generateWalletMutation.mutate()}
                    disabled={generateWalletMutation.isPending}
                    data-testid="button-generate-wallet"
                  >
                    {generateWalletMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Generate My Solturio Wallet
                      </>
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

        {/* GitHub Integration */}
        <div className="mb-6">
          <GitHubLink walletAddress={user?.walletAddress || undefined} />
        </div>

        {/* Notification Preferences */}
        <Card className="p-6 mb-6">
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

        {/* Appearance Settings */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose your preferred color scheme
              </p>
              <div className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => toggleTheme("light")}
                  className="gap-2"
                  data-testid="button-theme-light"
                >
                  <Sun className="w-4 h-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => toggleTheme("dark")}
                  className="gap-2"
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Social Media Handles */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Social Media Handles</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect with the community and let us reach you on your preferred platforms
          </p>
          <div className="space-y-4">
            {/* Twitter */}
            <div>
              <Label htmlFor="twitter-handle" className="flex items-center gap-2 mb-2">
                <Twitter className="w-4 h-4" />
                Twitter / X
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="twitter-handle"
                    placeholder="username"
                    value={socialHandles.twitterHandle}
                    onChange={(e) => setSocialHandles({ ...socialHandles, twitterHandle: e.target.value })}
                    className="pl-7"
                    data-testid="input-twitter"
                  />
                </div>
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ twitterHandle: socialHandles.twitterHandle })}
                  disabled={updateSocialHandlesMutation.isPending}
                  data-testid="button-save-twitter"
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Telegram */}
            <div>
              <Label htmlFor="telegram-handle" className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4" />
                Telegram
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="telegram-handle"
                    placeholder="username"
                    value={socialHandles.telegramHandle}
                    onChange={(e) => setSocialHandles({ ...socialHandles, telegramHandle: e.target.value })}
                    className="pl-7"
                    data-testid="input-telegram"
                  />
                </div>
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ telegramHandle: socialHandles.telegramHandle })}
                  disabled={updateSocialHandlesMutation.isPending}
                  data-testid="button-save-telegram"
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Discord */}
            <div>
              <Label htmlFor="discord-handle" className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" />
                Discord
              </Label>
              <div className="flex gap-2">
                <Input
                  id="discord-handle"
                  placeholder="username#0000 or just username"
                  value={socialHandles.discordHandle}
                  onChange={(e) => setSocialHandles({ ...socialHandles, discordHandle: e.target.value })}
                  data-testid="input-discord"
                />
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ discordHandle: socialHandles.discordHandle })}
                  disabled={updateSocialHandlesMutation.isPending}
                  data-testid="button-save-discord"
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Instagram */}
            <div>
              <Label htmlFor="instagram-handle" className="flex items-center gap-2 mb-2">
                <Instagram className="w-4 h-4" />
                Instagram
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="instagram-handle"
                    placeholder="username"
                    value={socialHandles.instagramHandle}
                    onChange={(e) => setSocialHandles({ ...socialHandles, instagramHandle: e.target.value })}
                    className="pl-7"
                    data-testid="input-instagram"
                  />
                </div>
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ instagramHandle: socialHandles.instagramHandle })}
                  disabled={updateSocialHandlesMutation.isPending}
                  data-testid="button-save-instagram"
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Telegram Group */}
            <div>
              <Label htmlFor="telegram-group" className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                Telegram Group / Channel
              </Label>
              <div className="flex gap-2">
                <Input
                  id="telegram-group"
                  placeholder="https://t.me/yourgroup"
                  value={socialHandles.telegramGroupLink}
                  onChange={(e) => setSocialHandles({ ...socialHandles, telegramGroupLink: e.target.value })}
                  data-testid="input-telegram-group"
                />
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ telegramGroupLink: socialHandles.telegramGroupLink })}
                  disabled={updateSocialHandlesMutation.isPending}
                  data-testid="button-save-telegram-group"
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Website */}
            <div>
              <Label htmlFor="website" className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <div className="flex gap-2">
                <Input
                  id="website"
                  placeholder="https://yourwebsite.com"
                  value={socialHandles.websiteUrl}
                  onChange={(e) => setSocialHandles({ ...socialHandles, websiteUrl: e.target.value })}
                  data-testid="input-website"
                />
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ websiteUrl: socialHandles.websiteUrl })}
                  disabled={updateSocialHandlesMutation.isPending}
                  data-testid="button-save-website"
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" />
                Company / Community Bio
              </Label>
              <div className="space-y-2">
                <Textarea
                  id="bio"
                  placeholder="Tell us about your company or community..."
                  value={socialHandles.bio}
                  onChange={(e) => setSocialHandles({ ...socialHandles, bio: e.target.value })}
                  rows={4}
                  data-testid="input-bio"
                />
                <Button
                  onClick={() => updateSocialHandlesMutation.mutate({ bio: socialHandles.bio })}
                  disabled={updateSocialHandlesMutation.isPending}
                  className="w-full sm:w-auto"
                  data-testid="button-save-bio"
                >
                  Save Bio
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Export Private Key Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-export-key">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Export Private Key - CRITICAL SECURITY WARNING
            </DialogTitle>
            <DialogDescription>
              Your private key grants full control over your wallet. Anyone with this key can access and steal your NFTs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Security Warnings</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p>• Never share this key with anyone</p>
                <p>• Never enter it on untrusted websites</p>
                <p>• Store it offline in a secure location</p>
                <p>• Anyone with this key can steal your NFTs</p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Private Key (Array Format for Phantom)</Label>
              <div className="relative">
                <pre className="text-xs font-mono bg-muted p-3 rounded max-h-40 overflow-auto border" data-testid="text-private-key">
                  {exportedPrivateKey ? JSON.stringify(exportedPrivateKey) : "Loading..."}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => exportedPrivateKey && copyToClipboard(JSON.stringify(exportedPrivateKey), "Private key")}
                  data-testid="button-copy-private-key"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4 space-y-3">
              <p className="font-medium text-sm">How to Import into Phantom:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Open Phantom wallet extension or app</li>
                <li>Click the menu (top right) → "Add / Connect Wallet"</li>
                <li>Select "Import Private Key"</li>
                <li>Paste the array shown above (or use the downloaded JSON file)</li>
                <li>Name your wallet "Solturio Wallet"</li>
                <li>Your NFTs will now appear in Phantom!</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={downloadPrivateKey}
              disabled={!exportedPrivateKey}
              variant="outline"
              data-testid="button-download-key"
            >
              <Download className="w-4 h-4 mr-2" />
              Download as JSON
            </Button>
            <Button
              onClick={() => {
                setShowExportDialog(false);
                setExportedPrivateKey(null);
              }}
              data-testid="button-close-dialog"
            >
              I've Saved It Securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

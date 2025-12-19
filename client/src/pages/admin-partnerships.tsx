import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, 
  Download, 
  Building2, 
  Globe, 
  Mail, 
  Send, 
  ExternalLink,
  Sparkles,
  Shield,
  Users,
  Rocket,
  Lock
} from "lucide-react";

// Admin email whitelist - should match admin-dashboard.tsx
const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

export default function AdminPartnerships() {
  const [dexName, setDexName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    document.title = "Partnership Tools - Solturio Admin";
  }, []);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.email) {
      const adminAccess = ADMIN_EMAILS.includes(user.email.toLowerCase());
      setIsAdmin(adminAccess);
      
      if (!adminAccess) {
        toast({
          title: "Access Denied",
          description: "Admin access required for partnership tools",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    } else if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access admin tools",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading partnership tools...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <Lock className="w-8 h-8 text-destructive mx-auto mb-2" />
            <CardTitle className="text-center">Admin Access Required</CardTitle>
            <CardDescription className="text-center">
              Partnership tools are restricted to Solturio administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const downloadSolanaProposal = async () => {
    try {
      const response = await fetch("/api/documents/solana-foundation-proposal");
      if (!response.ok) throw new Error("Failed to generate document");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Solturio-Solana-Foundation-Proposal.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded Successfully",
        description: "Solana Foundation proposal has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate the proposal document",
        variant: "destructive",
      });
    }
  };

  const downloadDEXProposal = async () => {
    if (!dexName.trim()) {
      toast({
        title: "Platform Name Required",
        description: "Please enter the DEX platform name",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/documents/dex-partnership-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dexName }),
      });
      
      if (!response.ok) throw new Error("Failed to generate document");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Solturio-DEX-Partnership-${dexName}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded Successfully",
        description: `Partnership proposal for ${dexName} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate the proposal document",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
            <Button variant="outline" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Partnership & Outreach</h1>
          <p className="text-lg text-muted-foreground">
            Download professional proposals and partnership materials to share Solturio with DEXs, investors, and the Solana ecosystem
          </p>
        </div>

        {/* Key Partners Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Strategic Partners</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Wallet Buddhi</h3>
                  <Badge variant="outline" className="mt-1">First Enterprise Client</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Our flagship partnership showcasing enterprise-grade IP protection for Web3 wallets
              </p>
            </Card>

            <Card className="p-6 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-background">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">$CATH Token</h3>
                  <Badge variant="outline" className="mt-1">Rewards Partner</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Powering our education rewards system with real token incentives
              </p>
            </Card>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Solana Foundation Proposal */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">Solana Foundation</h3>
                <Badge variant="secondary">Grant Proposal</Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Comprehensive proposal for Solana Foundation grant support and ecosystem integration. 
              Includes technical architecture, adoption strategy, and partnership benefits.
            </p>

            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Document includes:</span>
                </div>
                <ul className="ml-6 space-y-1 text-muted-foreground">
                  <li>• Problem statement & solution</li>
                  <li>• Technical implementation on Solana</li>
                  <li>• Ecosystem benefits</li>
                  <li>• Grant requirements</li>
                  <li>• Roadmap and milestones</li>
                </ul>
              </div>

              <Button 
                onClick={downloadSolanaProposal}
                className="w-full"
                data-testid="button-download-solana-proposal"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Solana Proposal
              </Button>
            </div>
          </Card>

          {/* DEX Partnership Proposal */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">DEX Platforms</h3>
                <Badge variant="secondary">Partnership Proposal</Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Customizable proposal for DEX platforms showcasing our free verification API 
              and anti-copycat protection system.
            </p>

            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Document includes:</span>
                </div>
                <ul className="ml-6 space-y-1 text-muted-foreground">
                  <li>• Free API integration guide</li>
                  <li>• ROI and metrics</li>
                  <li>• 3-line code implementation</li>
                  <li>• Partnership tiers</li>
                  <li>• Success stories</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dex-name">DEX Platform Name</Label>
                <Input
                  id="dex-name"
                  placeholder="e.g., DexScreener, Raydium, Jupiter"
                  value={dexName}
                  onChange={(e) => setDexName(e.target.value)}
                  data-testid="input-dex-name"
                />
              </div>

              <Button 
                onClick={downloadDEXProposal}
                className="w-full"
                disabled={isGenerating}
                data-testid="button-download-dex-proposal"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate DEX Proposal"}
              </Button>
            </div>
          </Card>

          {/* Email Templates */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">Email Templates</h3>
                <Badge variant="secondary">Outreach Materials</Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Professional email templates for reaching out to potential partners and platforms.
            </p>

            <div className="space-y-3">
              <Button variant="outline" className="w-full" data-testid="button-dex-email">
                <Send className="w-4 h-4 mr-2" />
                DEX Introduction Email
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-investor-email">
                <Users className="w-4 h-4 mr-2" />
                Investor Pitch Email
              </Button>
            </div>
          </Card>

          {/* Resources */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">Resources</h3>
                <Badge variant="secondary">External Links</Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Useful resources and documentation for partners.
            </p>

            <div className="space-y-3">
              <Button variant="outline" className="w-full" asChild>
                <a href="/dex-intro" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  DEX Introduction Page
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="/api-docs" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  API Documentation
                </a>
              </Button>
            </div>
          </Card>
        </div>

        {/* Contact Section */}
        <Card className="p-6 mt-8 bg-gradient-to-r from-primary/5 to-background">
          <h3 className="text-xl font-semibold mb-3">Ready to Partner?</h3>
          <p className="text-muted-foreground mb-4">
            Contact our partnership team to discuss how Solturio can protect your platform from IP theft and copycats.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>partnerships@solturio.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>solturio.app</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
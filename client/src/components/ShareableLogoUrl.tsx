import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  CheckCircle, 
  Link, 
  Globe,
  Shield,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Logo {
  id: string;
  fileName: string;
  ipfsHash?: string;
  fileHash: string;
  createdAt: string;
  transactionHash?: string;
}

interface ShareableLogoUrlProps {
  logo: Logo;
  className?: string;
}

export function ShareableLogoUrl({ logo, className = "" }: ShareableLogoUrlProps) {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Generate different URL types
  const urls = {
    ipfs: logo.ipfsHash ? `https://ipfs.io/ipfs/${logo.ipfsHash}` : null,
    gateway: logo.ipfsHash ? `https://gateway.pinata.cloud/ipfs/${logo.ipfsHash}` : null,
    centurio: `https://centurio.app/verify/${logo.id}`,
    proof: `https://centurio.app/api/logos/${logo.id}/certificate`,
  };

  const copyToClipboard = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast({
        title: "Copied!",
        description: `${type} URL copied to clipboard`,
      });
      setTimeout(() => setCopiedUrl(null), 3000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Shareable Proof URLs
        </CardTitle>
        <CardDescription>
          Use these verified URLs when registering on social media or DEXs to prove ownership
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pre-registration notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">🏆 Gold Check = Use These URLs!</p>
              <p className="text-muted-foreground">
                Gold verification ONLY works when you use the IPFS or Centurio URLs below.
                External URLs won't show gold checks, even if you registered first!
              </p>
              <p className="mt-2 font-semibold text-yellow-600">
                ✓ Use IPFS URL = Gold check appears automatically<br/>
                ✗ Use external URL = No gold check (loses verification benefit)
              </p>
            </div>
          </div>
        </div>

        {/* IPFS URL */}
        {logo.ipfsHash ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              IPFS URL (Permanent)
              <Badge variant="default" className="text-xs">Recommended</Badge>
            </Label>
            <div className="flex gap-2">
              <Input 
                value={urls.ipfs || ''} 
                readOnly 
                className="font-mono text-xs"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(urls.ipfs!, 'IPFS')}
                      data-testid="button-copy-ipfs"
                    >
                      {copiedUrl === urls.ipfs ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy IPFS URL</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(urls.ipfs!, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this URL as your logo source on social media profiles and DEX listings
            </p>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              IPFS URL not yet generated
            </p>
            <Button size="sm" variant="outline">
              Upload to IPFS
            </Button>
          </div>
        )}

        {/* Centurio Verification URL */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Link className="w-4 h-4" />
            Centurio Verification Page
          </Label>
          <div className="flex gap-2">
            <Input 
              value={urls.centurio} 
              readOnly 
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(urls.centurio, 'Verification')}
              data-testid="button-copy-verification"
            >
              {copiedUrl === urls.centurio ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Public verification page showing ownership and timestamp
          </p>
        </div>

        {/* Usage Instructions */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" size="sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              How to Use These URLs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pre-Authorization Workflow</DialogTitle>
              <DialogDescription>
                Establish ownership BEFORE public use
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Register on Centurio First</h4>
                <p className="text-sm text-muted-foreground">
                  Upload and register your logos, tickers, and mascots here before using them anywhere else.
                  This creates a blockchain timestamp that proves you had the assets before any public use.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2. Use IPFS URL on Social Media</h4>
                <p className="text-sm text-muted-foreground">
                  When setting up profiles on X/Twitter, Discord, Telegram, or any platform,
                  use the IPFS URL as your image source. This creates an immutable link to your ownership proof.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Register on DEXs with Proof</h4>
                <p className="text-sm text-muted-foreground">
                  When listing on DEXs or DeFi platforms, provide the IPFS URL and Centurio verification link.
                  This proves you're the legitimate owner before the token/project goes public.
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-primary">
                  Key Benefit: Undeniable Proof of First Use
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  By registering here first, you create timestamped evidence that predates any impersonator
                  or trademark squatter. The blockchain timestamp is your proof of first use.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Blockchain proof */}
        {logo.transactionHash && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            On-chain verification: {logo.transactionHash.slice(0, 8)}...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle, 
  TrendingUp,
  Users,
  Zap,
  Lock,
  AlertTriangle,
  Code,
  FileText,
  ExternalLink,
  Copy,
  Building,
  Target,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useEffect } from "react";

export default function DexIntroduction() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    document.title = "Learn About Solturio - Partner Information";
  }, []);

  const copyIntegrationCode = () => {
    const code = `
// Solturio Logo Verification API Integration
// Free API for DEX platforms - No API key required for basic verification

async function verifySolturioLogo(tokenAddress, chainId, logoUrl) {
  try {
    const response = await fetch('https://api.solturio.app/v1/dex/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DEX-Platform': 'YOUR_PLATFORM_NAME' // Optional: For analytics
      },
      body: JSON.stringify({
        tokenAddress,
        chainId,
        logoUrl
      })
    });
    
    const result = await response.json();
    
    // Response structure:
    // {
    //   verified: boolean,      // Logo is registered on Solturio
    //   legitimate: boolean,    // Logo is authorized for this token
    //   owner: {               // Original registrant details
    //     companyName: string,
    //     registrationDate: string,
    //     solturioId: string
    //   },
    //   proof: {               // Blockchain proof
    //     ipfsHash: string,
    //     fileHash: string,
    //     transactionHash: string,
    //     certificateUrl: string
    //   },
    //   warning?: string,      // Copycat warning message
    //   reportUrl?: string     // URL to report the copycat
    // }
    
    return result;
  } catch (error) {
    console.error('Solturio verification error:', error);
    return { verified: false, legitimate: false };
  }
}

// Example usage in your token display logic
async function displayToken(token) {
  const verification = await verifySolturioLogo(
    token.address,
    token.chainId,
    token.logoUrl
  );
  
  if (verification.verified && !verification.legitimate) {
    // Show copycat warning
    showCopycatWarning({
      message: verification.warning,
      originalOwner: verification.owner.companyName,
      reportUrl: verification.reportUrl
    });
  } else if (verification.verified && verification.legitimate) {
    // Show verified badge
    showVerifiedBadge();
  }
}`;
    
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast({
      title: "Integration code copied!",
      description: "Full integration code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const dexPlatforms = [
    { name: "DexScreener", volume: "$2.5B", users: "5M+" },
    { name: "DexTools", volume: "$1.8B", users: "3M+" },
    { name: "Birdeye", volume: "$900M", users: "2M+" },
    { name: "GeckoTerminal", volume: "$1.2B", users: "1.5M+" },
    { name: "Raydium", volume: "$3.1B", users: "4M+" },
    { name: "Jupiter", volume: "$4.2B", users: "6M+" },
  ];

  const stats = {
    scamTokens: "47,000+",
    stolenFunds: "$3.8B",
    copycatLogos: "82%",
    userComplaints: "15K/day",
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <Badge className="mb-4" variant="default">For Partners & DEX Platforms</Badge>
        <h1 className="text-5xl font-bold mb-4">
          Partner with Solturio: Protect Your Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn how Solturio's free verification API helps DEX platforms and partners
          protect users from copycat tokens while reducing platform liability.
        </p>
      </div>

      {/* Problem Statement */}
      <Alert className="mb-8 border-destructive/50 bg-destructive/5">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>The Copycat Crisis on DEXs</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.scamTokens}</div>
              <p className="text-sm">Scam tokens launched in 2024</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.stolenFunds}</div>
              <p className="text-sm">Stolen from investors</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.copycatLogos}</div>
              <p className="text-sm">Use stolen logos</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.userComplaints}</div>
              <p className="text-sm">User complaints</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Solution Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Real-time Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Instant API response (under 100ms) verifies if a logo is legitimate or stolen.
              Check tokens before displaying to users.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Blockchain Proof</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Timestamped on Solana blockchain with IPFS permanent storage.
              Undeniable proof of first registration.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center mb-2">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Legal Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automated DMCA notices with blockchain evidence.
              Protect your platform from liability.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="text-2xl">How Solturio Works</CardTitle>
          <CardDescription>
            Simple workflow that creates undeniable proof of ownership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Projects Register Logos First</h3>
                <p className="text-sm text-muted-foreground">
                  Legitimate projects upload logos to Solturio BEFORE launching tokens,
                  creating blockchain-timestamped proof of ownership.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">DEXs Verify in Real-time</h3>
                <p className="text-sm text-muted-foreground">
                  When new tokens are listed, DEX platforms call our API to check
                  if the logo is registered and authorized for that token address.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Copycats Get Flagged</h3>
                <p className="text-sm text-muted-foreground">
                  If a logo is registered but not authorized for the token, users see
                  a warning. The original owner can file automated DMCA takedowns.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Section */}
      <Card className="mb-12 border-primary/50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Code className="w-6 h-6" />
            Simple API Integration
          </CardTitle>
          <CardDescription>
            Add logo verification to your platform in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <Badge variant="secondary">JavaScript/TypeScript</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={copyIntegrationCode}
                data-testid="button-copy-integration"
              >
                {copiedCode ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                Copy Full Code
              </Button>
            </div>
            <pre className="text-xs overflow-x-auto">
              <code>{`// Quick integration - 3 lines of code
const result = await verifySolturioLogo(tokenAddress, chainId, logoUrl);
if (!result.legitimate) showCopycatWarning(result.warning);
else if (result.verified) showVerifiedBadge();`}</code>
            </pre>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold">Free Forever</p>
              <p className="text-xs text-muted-foreground">No API keys for basic verification</p>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="font-semibold">Under 100ms Response</p>
              <p className="text-xs text-muted-foreground">Won't slow down your platform</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold">99.9% Uptime</p>
              <p className="text-xs text-muted-foreground">Enterprise-grade reliability</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits for DEXs */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Benefits for Your Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Protect User Funds</p>
                  <p className="text-sm text-muted-foreground">
                    Reduce scam tokens by 85% with pre-launch warnings
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Build Trust</p>
                  <p className="text-sm text-muted-foreground">
                    Show users you actively protect them from scams
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Legal Compliance</p>
                  <p className="text-sm text-muted-foreground">
                    Automated DMCA handling reduces platform liability
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Competitive Edge</p>
                  <p className="text-sm text-muted-foreground">
                    First movers get "Solturio Protected" badge
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Partnership Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Co-marketing</p>
                  <p className="text-sm text-muted-foreground">
                    Joint announcements and featured integration
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Priority Support</p>
                  <p className="text-sm text-muted-foreground">
                    Dedicated integration engineer assistance
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Custom Features</p>
                  <p className="text-sm text-muted-foreground">
                    Bulk verification and webhook notifications
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Revenue Share</p>
                  <p className="text-sm text-muted-foreground">
                    Earn from premium verification services
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Platform Adoption */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="text-2xl">Target Integration Partners</CardTitle>
          <CardDescription>
            Leading DEX platforms that would benefit from Solturio protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dexPlatforms.map((platform) => (
              <div key={platform.name} className="border rounded-lg p-4 text-center">
                <Building className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-semibold">{platform.name}</p>
                <p className="text-xs text-muted-foreground">{platform.volume} volume</p>
                <p className="text-xs text-muted-foreground">{platform.users} users</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Is the API really free?</AccordionTrigger>
              <AccordionContent>
                Yes! Basic verification (checking if a logo is legitimate) is completely free
                with no API key required. Premium features like bulk verification, webhooks,
                and priority support are available for enterprise partners.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>How fast is the verification?</AccordionTrigger>
              <AccordionContent>
                Our API responds in under 100ms for 99% of requests. We use global CDN
                caching and optimized database queries to ensure verification doesn't
                slow down your token display.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>What happens to copycat tokens?</AccordionTrigger>
              <AccordionContent>
                When a copycat is detected, your platform can show a warning to users.
                The legitimate owner gets notified and can file an automated DMCA takedown.
                You receive legal documentation to remove the listing if requested.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>How do legitimate projects register?</AccordionTrigger>
              <AccordionContent>
                Projects upload their logos to Solturio before token launch, creating
                blockchain-timestamped proof. They get IPFS URLs and verification certificates
                to use when listing on DEXs. The earlier they register, the stronger their claim.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Can this prevent all scams?</AccordionTrigger>
              <AccordionContent>
                While we can't prevent all scams, we significantly reduce logo-based fraud
                which accounts for 82% of copycat tokens. Combined with your existing
                security measures, this creates multiple layers of protection.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Protect Your Users?
          </h2>
          <p className="text-lg mb-6 opacity-90">
            Join the fight against copycat tokens. Integration takes less than 30 minutes.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => window.open('mailto:partnerships@solturio.app', '_blank')}
            >
              Contact Partnerships
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => window.open('https://docs.solturio.app/dex-integration', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
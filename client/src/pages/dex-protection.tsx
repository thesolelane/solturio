import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle, 
  Copy, 
  Ban,
  FileText,
  ExternalLink,
  Search,
  Loader2,
  ShieldAlert,
  Link,
  Building2,
  MessageCircle,
  Globe,
  Users
} from "lucide-react";
import { SiX, SiTelegram, SiDiscord } from "react-icons/si";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Logo } from "@shared/schema";

export default function DexProtection() {
  const { toast } = useToast();
  const [searchHash, setSearchHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<Logo | null>(null);
  const [reportType, setReportType] = useState<"token" | "telegram" | "twitter" | "website" | "discord">("token");

  // Get user's logos
  const { data: logos = [], isLoading: logosLoading } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
  });

  // Verify by hash mutation
  const verifyHashMutation = useMutation({
    mutationFn: async (hash: string) => {
      const response = await fetch(`/api/verify/hash/${hash}`);
      if (!response.ok) {
        throw new Error("Verification failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      if (!data.verified) {
        toast({
          title: "Not Registered",
          description: "This logo hash is not registered on Solturio",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Could not verify the logo hash",
        variant: "destructive",
      });
    },
  });

  // Report copycat mutation
  const reportCopycatMutation = useMutation({
    mutationFn: async (data: {
      originalLogoId: string;
      copycatContractAddress: string;
      copycatTicker?: string;
      copycatName?: string;
      dexPlatform: string;
      evidenceUrl: string;
      copycatTwitter?: string;
      copycatTelegram?: string;
      copycatWebsite?: string;
      copycatTiktok?: string;
      copycatFacebook?: string;
      copycatInstagram?: string;
      copycatDiscord?: string;
      screenshotUrl?: string;
      evidenceDescription?: string;
    }) => apiRequest('/api/copycat/report', 'POST', data),
    onSuccess: (result: any) => {
      toast({
        title: "Report Submitted",
        description: `Report ID: ${result.reportId}. We'll send a DMCA notice to the platform.`,
      });
      setReportDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to Submit Report",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleVerifyHash = () => {
    if (searchHash) {
      verifyHashMutation.mutate(searchHash);
    }
  };


  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Get Protected on DEX Platforms</h1>
        <p className="text-lg text-muted-foreground mb-4">
          Register your logos and tickers BEFORE launching to prevent copycats
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild className="gap-2">
            <a href="/upload">
              <Shield className="w-4 h-4" />
              Get Protected Now
            </a>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              const reportSection = document.getElementById('report-section');
              reportSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <ShieldAlert className="w-4 h-4" />
            Report IP Theft
          </Button>
        </div>
      </div>

      {/* Pre-registration workflow */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            The Anti-Copycat Workflow
          </CardTitle>
          <CardDescription>
            Register first, use everywhere - create undeniable proof of ownership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-1">Register on Solturio</h3>
              <p className="text-sm text-muted-foreground">
                Upload logos/tickers before any public use
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-1">Get IPFS URL</h3>
              <p className="text-sm text-muted-foreground">
                Receive permanent, verifiable image URL
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">Use on DEXs</h3>
              <p className="text-sm text-muted-foreground">
                List with verified Solturio/IPFS URLs
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">Protected</h3>
              <p className="text-sm text-muted-foreground">
                Blockchain proves you registered first
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Verify Logo Hash */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Verify Logo by Hash
            </CardTitle>
            <CardDescription>
              Check if a logo is registered and identify the original owner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo SHA-256 Hash</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter file hash..."
                  value={searchHash}
                  onChange={(e) => setSearchHash(e.target.value)}
                  className="font-mono text-xs"
                  data-testid="input-verify-hash"
                />
                <Button
                  onClick={handleVerifyHash}
                  disabled={!searchHash || verifyHashMutation.isPending}
                  data-testid="button-verify-hash"
                >
                  {verifyHashMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </div>

            {verificationResult && (
              <div className="space-y-3">
                {verificationResult.verified ? (
                  <>
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertTitle>Logo Verified</AlertTitle>
                      <AlertDescription>
                        Original owner: {verificationResult.original.companyName}
                      </AlertDescription>
                    </Alert>
                    <div className="text-sm space-y-1">
                      <p><strong>Registration:</strong> {new Date(verificationResult.original.registrationDate).toLocaleDateString()}</p>
                      {verificationResult.original.ipfsHash && (
                        <p><strong>IPFS:</strong> {verificationResult.original.ipfsHash.slice(0, 12)}...</p>
                      )}
                      {verificationResult.possibleCopies > 0 && (
                        <Badge variant="destructive">
                          {verificationResult.possibleCopies} possible copies detected
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Not Registered</AlertTitle>
                    <AlertDescription>
                      This logo is not registered on Solturio
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report IP Theft */}
        <Card id="report-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Report IP Theft
            </CardTitle>
            <CardDescription>
              Report CAs or individuals using your intellectual property without permission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logos.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Get protected first - upload your logos to report IP theft
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Your Protected Logo</Label>
                  <Select onValueChange={(value) => {
                    const logo = logos.find(l => l.id === value);
                    setSelectedLogo(logo || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose which IP was stolen" />
                    </SelectTrigger>
                    <SelectContent>
                      {logos.map((logo) => (
                        <SelectItem key={logo.id} value={logo.id}>
                          {logo.fileName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLogo && (
                  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="destructive">
                        <Ban className="w-4 h-4 mr-2" />
                        Report CA Using My IP
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Report IP Theft</DialogTitle>
                        <DialogDescription>
                          Report anyone stealing your intellectual property: {selectedLogo.fileName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Report Type Selection */}
                        <div className="space-y-4 border rounded-lg p-4">
                          <h3 className="font-semibold mb-3">What type of IP theft are you reporting?</h3>
                          <RadioGroup value={reportType} onValueChange={(value: any) => setReportType(value)}>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex items-center space-x-2 cursor-pointer">
                                <RadioGroupItem value="token" id="token" />
                                <Label htmlFor="token" className="cursor-pointer flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Token/CA using my logo on DEX
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 cursor-pointer">
                                <RadioGroupItem value="telegram" id="telegram" />
                                <Label htmlFor="telegram" className="cursor-pointer flex items-center gap-2">
                                  <SiTelegram className="w-4 h-4" />
                                  Telegram channel/group impersonation
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 cursor-pointer">
                                <RadioGroupItem value="twitter" id="twitter" />
                                <Label htmlFor="twitter" className="cursor-pointer flex items-center gap-2">
                                  <SiX className="w-4 h-4" />
                                  Twitter/X account using my brand
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 cursor-pointer">
                                <RadioGroupItem value="website" id="website" />
                                <Label htmlFor="website" className="cursor-pointer flex items-center gap-2">
                                  <Globe className="w-4 h-4" />
                                  Fraudulent website copying my brand
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 cursor-pointer">
                                <RadioGroupItem value="discord" id="discord" />
                                <Label htmlFor="discord" className="cursor-pointer flex items-center gap-2">
                                  <SiDiscord className="w-4 h-4" />
                                  Discord server using my IP
                                </Label>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Dynamic Form Based on Report Type */}
                        <div className="space-y-4 border rounded-lg p-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Ban className="w-4 h-4" />
                            {reportType === "token" && "Contract Address Details"}
                            {reportType === "telegram" && "Telegram Violation Details"}
                            {reportType === "twitter" && "Twitter/X Violation Details"}
                            {reportType === "website" && "Website Violation Details"}
                            {reportType === "discord" && "Discord Violation Details"}
                          </h3>

                          {reportType === "token" && (
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <Label>Contract Address*</Label>
                                <Input
                                  placeholder="CA using your logo without permission"
                                  id="copycat-ca"
                                  data-testid="input-copycat-ca"
                                />
                              </div>
                              <div>
                                <Label>Token Ticker</Label>
                                <Input
                                  placeholder="$FAKE"
                                id="copycat-ticker"
                                data-testid="input-copycat-ticker"
                              />
                            </div>
                              <div>
                                <Label>Token Name</Label>
                                <Input
                                  placeholder="Fake Token Name"
                                  id="copycat-name"
                                  data-testid="input-copycat-name"
                                />
                              </div>
                              <div>
                                <Label>Found on Platform*</Label>
                                <Select>
                                  <SelectTrigger data-testid="select-dex-platform">
                                    <SelectValue placeholder="Select platform" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dexscreener">DexScreener</SelectItem>
                                    <SelectItem value="dextools">DexTools</SelectItem>
                                    <SelectItem value="birdeye">Birdeye</SelectItem>
                                    <SelectItem value="raydium">Raydium</SelectItem>
                                    <SelectItem value="jupiter">Jupiter</SelectItem>
                                    <SelectItem value="pumpfun">Pump.fun</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {reportType === "telegram" && (
                            <div className="space-y-4">
                              <div>
                                <Label>Telegram URL*</Label>
                                <Input
                                  placeholder="https://t.me/fake_channel or @fake_username"
                                  id="telegram-url"
                                  data-testid="input-telegram-url"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Paste the Telegram channel, group, or user link
                                </p>
                              </div>
                              <div>
                                <Label>Type of Violation</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select violation type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="exact">Exact copy of my brand name</SelectItem>
                                    <SelectItem value="variation">Deceptive variation (e.g., added underscore)</SelectItem>
                                    <SelectItem value="logo">Using my logo without permission</SelectItem>
                                    <SelectItem value="impersonation">Full impersonation of my project</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Members/Subscribers Count</Label>
                                <Input
                                  placeholder="e.g., 5000"
                                  id="telegram-members"
                                  type="number"
                                />
                              </div>
                            </div>
                          )}

                          {reportType === "twitter" && (
                            <div className="space-y-4">
                              <div>
                                <Label>Twitter/X URL*</Label>
                                <Input
                                  placeholder="https://twitter.com/fake_account or @fake_handle"
                                  id="twitter-url"
                                  data-testid="input-twitter-url"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Paste the Twitter/X profile or post link
                                </p>
                              </div>
                              <div>
                                <Label>Type of Violation</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select violation type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pfp">Using my logo as profile picture</SelectItem>
                                    <SelectItem value="handle">Deceptive handle variation</SelectItem>
                                    <SelectItem value="impersonation">Full account impersonation</SelectItem>
                                    <SelectItem value="content">Posting my IP without permission</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Followers Count</Label>
                                <Input
                                  placeholder="e.g., 10000"
                                  id="twitter-followers"
                                  type="number"
                                />
                              </div>
                            </div>
                          )}

                          {reportType === "website" && (
                            <div className="space-y-4">
                              <div>
                                <Label>Fraudulent Website URL*</Label>
                                <Input
                                  placeholder="https://fake-website.com"
                                  id="website-url"
                                  data-testid="input-website-url"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Enter the full URL of the website stealing your IP
                                </p>
                              </div>
                              <div>
                                <Label>Type of Violation</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select violation type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="clone">Complete website clone</SelectItem>
                                    <SelectItem value="logo">Using my logo/brand assets</SelectItem>
                                    <SelectItem value="phishing">Phishing/scam site using my brand</SelectItem>
                                    <SelectItem value="content">Copying my content without permission</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Domain Registrar (if known)</Label>
                                <Input
                                  placeholder="e.g., GoDaddy, Namecheap"
                                  id="website-registrar"
                                />
                              </div>
                            </div>
                          )}

                          {reportType === "discord" && (
                            <div className="space-y-4">
                              <div>
                                <Label>Discord Server Invite Link*</Label>
                                <Input
                                  placeholder="https://discord.gg/fake_server"
                                  id="discord-url"
                                  data-testid="input-discord-url"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Paste the Discord server invite link
                                </p>
                              </div>
                              <div>
                                <Label>Server Name</Label>
                                <Input
                                  placeholder="Fake Project Server"
                                  id="discord-name"
                                />
                              </div>
                              <div>
                                <Label>Member Count</Label>
                                <Input
                                  placeholder="e.g., 2000"
                                  id="discord-members"
                                  type="number"
                                />
                              </div>
                            </div>
                          )}
                        </div>


                        {/* Evidence */}
                        <div className="space-y-4 border rounded-lg p-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Evidence & Documentation
                          </h3>
                          <div>
                            <Label>Evidence URL*</Label>
                            <Input
                              placeholder="Direct link to copycat listing"
                              id="evidence-url"
                              data-testid="input-evidence-url"
                            />
                          </div>
                          <div>
                            <Label>Screenshot URL</Label>
                            <Input
                              placeholder="Link to screenshot evidence"
                              id="screenshot-url"
                              data-testid="input-screenshot-url"
                            />
                          </div>
                          <div>
                            <Label>Description of Infringement</Label>
                            <Textarea
                              placeholder="Describe how they're copying your logo, ticker, or name..."
                              id="evidence-description"
                              rows={3}
                              data-testid="input-evidence-description"
                            />
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            // Required fields
                            const copycatCA = (document.getElementById('copycat-ca') as HTMLInputElement)?.value;
                            const dexPlatform = (document.getElementById('dex-platform') as HTMLSelectElement)?.value;
                            const evidenceUrl = (document.getElementById('evidence-url') as HTMLInputElement)?.value;
                            
                            // Optional fields
                            const copycatTicker = (document.getElementById('copycat-ticker') as HTMLInputElement)?.value;
                            const copycatName = (document.getElementById('copycat-name') as HTMLInputElement)?.value;
                            
                            // Social media
                            const copycatTwitter = (document.getElementById('copycat-twitter') as HTMLInputElement)?.value;
                            const copycatTelegram = (document.getElementById('copycat-telegram') as HTMLInputElement)?.value;
                            const copycatWebsite = (document.getElementById('copycat-website') as HTMLInputElement)?.value;
                            const copycatDiscord = (document.getElementById('copycat-discord') as HTMLInputElement)?.value;
                            const copycatTiktok = (document.getElementById('copycat-tiktok') as HTMLInputElement)?.value;
                            const copycatFacebook = (document.getElementById('copycat-facebook') as HTMLInputElement)?.value;
                            const copycatInstagram = (document.getElementById('copycat-instagram') as HTMLInputElement)?.value;
                            
                            // Evidence
                            const screenshotUrl = (document.getElementById('screenshot-url') as HTMLInputElement)?.value;
                            const evidenceDescription = (document.getElementById('evidence-description') as HTMLTextAreaElement)?.value;
                            
                            if (selectedLogo && copycatCA && dexPlatform && evidenceUrl) {
                              reportCopycatMutation.mutate({
                                originalLogoId: selectedLogo.id,
                                copycatContractAddress: copycatCA,
                                copycatTicker: copycatTicker || undefined,
                                copycatName: copycatName || undefined,
                                dexPlatform,
                                evidenceUrl,
                                copycatTwitter: copycatTwitter || undefined,
                                copycatTelegram: copycatTelegram || undefined,
                                copycatWebsite: copycatWebsite || undefined,
                                copycatDiscord: copycatDiscord || undefined,
                                copycatTiktok: copycatTiktok || undefined,
                                copycatFacebook: copycatFacebook || undefined,
                                copycatInstagram: copycatInstagram || undefined,
                                screenshotUrl: screenshotUrl || undefined,
                                evidenceDescription: evidenceDescription || undefined,
                              });
                            } else {
                              toast({
                                title: "Missing Required Fields",
                                description: "Please fill in Contract Address, Platform, and Evidence URL",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={reportCopycatMutation.isPending}
                        >
                          {reportCopycatMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 mr-2" />
                          )}
                          Submit Comprehensive Report
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organizations & Letter Generation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Submit to Organizations
          </CardTitle>
          <CardDescription>
            Generate pre-formatted letters to submit your IP claims to platforms and authorities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Coming Soon</AlertTitle>
            <AlertDescription>
              We're building a database of organizations including:
            </AlertDescription>
          </Alert>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">DEX Platforms</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• DexScreener DMCA Email</li>
                <li>• Birdeye Support Contact</li>
                <li>• Raydium Verification API</li>
                <li>• Pump.fun Report Form</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Social Media</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Twitter/X IP Violation</li>
                <li>• Telegram Admin Contact</li>
                <li>• TikTok Copyright Center</li>
                <li>• Discord Trust & Safety</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Legal Authorities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• USPTO Trademark Office</li>
                <li>• U.S. Copyright Office</li>
                <li>• WIPO Global Brand Database</li>
                <li>• Domain Registrars</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Letter Templates</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• DMCA Takedown Notice</li>
                <li>• Cease & Desist Letter</li>
                <li>• Trademark Infringement</li>
                <li>• Platform Report Template</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-semibold">Auto-Generate Letters</p>
              <p className="text-sm text-muted-foreground">
                Include your registration number and CA violations
              </p>
            </div>
            <Badge variant="secondary">Feature Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Variation Protection */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Ticker Variation Protection
          </CardTitle>
          <CardDescription>
            Protect against similar variations of your ticker/name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Advanced Protection</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Register variations that are too close to your original:</p>
              <div className="mt-2 space-y-1">
                <p className="font-mono text-sm">• $CATH → Protects: $C.A.T.H, $C-A-T-H, $C4TH</p>
                <p className="font-mono text-sm">• Solturio → Protects: S0lturio, Sol-turio, SOLTURIO</p>
              </div>
              <p className="mt-2">This feature prevents copycats from using confusingly similar names.</p>
            </AlertDescription>
          </Alert>
          <Badge variant="secondary" className="mt-4">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
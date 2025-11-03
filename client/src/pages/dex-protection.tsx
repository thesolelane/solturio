import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  Ban,
  FileText,
  ExternalLink,
  Search,
  Loader2,
  ShieldAlert,
  Link
} from "lucide-react";
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
      fraudulentTokenAddress: string;
      dexPlatform: string;
      evidenceUrl: string;
      reporterEmail?: string;
    }) => apiRequest('/api/dex/report-copycat', 'POST', data),
    onSuccess: (result) => {
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

  const copyApiIntegration = () => {
    const code = `
// DEX Platform Integration - Solturio Logo Verification
async function verifyLogo(tokenAddress, logoUrl) {
  const response = await fetch('https://api.solturio.app/v1/dex/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenAddress, chainId: 1, logoUrl })
  });
  
  const result = await response.json();
  if (!result.legitimate) {
    showCopycatWarning(result.warning);
  }
}`;
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "API integration code copied to clipboard" });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">DEX Protection</h1>
        <p className="text-muted-foreground">
          Protect your logos from copycats on decentralized exchanges
        </p>
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

        {/* Report Copycat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Report Copycat Token
            </CardTitle>
            <CardDescription>
              File a DMCA takedown for unauthorized logo use on DEXs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logos.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Upload logos first to report copycats
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Your Logo</Label>
                  <Select onValueChange={(value) => {
                    const logo = logos.find(l => l.id === value);
                    setSelectedLogo(logo || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose logo to protect" />
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
                        Report Copycat
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report Copycat Token</DialogTitle>
                        <DialogDescription>
                          File a DMCA takedown for unauthorized use of {selectedLogo.fileName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Fraudulent Token Address</Label>
                          <Input
                            placeholder="0x..."
                            id="fraudulent-address"
                            data-testid="input-fraudulent-address"
                          />
                        </div>
                        <div>
                          <Label>DEX Platform</Label>
                          <Select id="dex-platform">
                            <SelectTrigger data-testid="select-dex-platform">
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dexscreener">DexScreener</SelectItem>
                              <SelectItem value="dextools">DexTools</SelectItem>
                              <SelectItem value="birdeye">Birdeye</SelectItem>
                              <SelectItem value="raydium">Raydium</SelectItem>
                              <SelectItem value="jupiter">Jupiter</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Evidence URL</Label>
                          <Input
                            placeholder="Link to copycat listing"
                            id="evidence-url"
                            data-testid="input-evidence-url"
                          />
                        </div>
                        <div>
                          <Label>Additional Notes</Label>
                          <Textarea
                            placeholder="Describe the infringement..."
                            id="notes"
                            data-testid="input-notes"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            const fraudulentAddress = (document.getElementById('fraudulent-address') as HTMLInputElement)?.value;
                            const dexPlatform = (document.getElementById('dex-platform') as HTMLSelectElement)?.value;
                            const evidenceUrl = (document.getElementById('evidence-url') as HTMLInputElement)?.value;
                            
                            if (selectedLogo && fraudulentAddress && dexPlatform && evidenceUrl) {
                              reportCopycatMutation.mutate({
                                originalLogoId: selectedLogo.id,
                                fraudulentTokenAddress: fraudulentAddress,
                                dexPlatform,
                                evidenceUrl,
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
                          Submit DMCA Takedown
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

      {/* DEX Integration */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            DEX Platform Integration
          </CardTitle>
          <CardDescription>
            Help DEX platforms verify legitimate logos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>For DEX Developers</AlertTitle>
            <AlertDescription>
              Integrate our verification API to protect users from copycat tokens.
              Verify logo legitimacy in real-time before displaying tokens.
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold">API Integration Code</p>
              <Button size="sm" variant="outline" onClick={copyApiIntegration}>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="text-xs overflow-x-auto">
              <code>{`// Verify logo before displaying token
const result = await verifyLogo(tokenAddress, logoUrl);
if (!result.legitimate) {
  showWarning(result.warning);
}`}</code>
            </pre>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">Real-time</div>
              <p className="text-sm text-muted-foreground">Instant verification</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">Automated</div>
              <p className="text-sm text-muted-foreground">DMCA notices</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">Free API</div>
              <p className="text-sm text-muted-foreground">For DEX platforms</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
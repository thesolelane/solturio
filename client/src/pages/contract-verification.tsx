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
  CheckCircle,
  Award,
  Lock,
  Calendar,
  Link,
  Copy,
  Code,
  Loader2,
  AlertCircle,
  Trophy,
  Star,
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Logo } from "@shared/schema";

export default function ContractVerification() {
  const { toast } = useToast();
  const [selectedLogo, setSelectedLogo] = useState<Logo | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [deploymentDate, setDeploymentDate] = useState("");
  const [isBindingDialogOpen, setIsBindingDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Get user's logos
  const { data: logos = [], isLoading: logosLoading } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
  });

  // Bind contract mutation
  const bindContractMutation = useMutation({
    mutationFn: async (data: {
      logoId: string;
      contractAddress: string;
      chainId: number;
      deploymentDate: string;
    }) => apiRequest("/api/contract/bind", "POST", data),
    onSuccess: (result) => {
      toast({
        title: result.verificationLevel === "gold" ? "🏆 Gold Verification!" : "Contract Bound",
        description:
          result.verificationLevel === "gold"
            ? "Your logo has received Gold verification for pre-launch registration!"
            : "Contract successfully bound to your logo",
      });
      setIsBindingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/logos"] });
    },
    onError: () => {
      toast({
        title: "Binding Failed",
        description: "Could not bind contract to logo",
        variant: "destructive",
      });
    },
  });

  const copyOverlayScript = () => {
    const script = `
<!-- Solturio Gold Check Auto-Overlay -->
<!-- Add this script to your website to automatically show gold checks on verified logos -->
<script src="https://cdn.solturio.app/overlay.js"></script>
<script>
  Solturio.enableGoldOverlay({
    contractAddress: '${contractAddress || "YOUR_CONTRACT_ADDRESS"}',
    showBadge: true,
    position: 'top-right'
  });
</script>`;

    navigator.clipboard.writeText(script);
    setCopiedCode(true);
    toast({
      title: "Script copied!",
      description: "Gold overlay script copied to clipboard",
    });
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleBindContract = () => {
    if (selectedLogo && contractAddress && deploymentDate) {
      bindContractMutation.mutate({
        logoId: selectedLogo.id,
        contractAddress,
        chainId: 1, // Default to Ethereum mainnet
        deploymentDate,
      });
    }
  };

  // Calculate days before launch for selected logo
  const calculateDaysBeforeLaunch = () => {
    if (!selectedLogo || !deploymentDate) return null;

    const registration = new Date(selectedLogo.createdAt);
    const deployment = new Date(deploymentDate);

    if (registration >= deployment) return null;

    const days = Math.floor(
      (deployment.getTime() - registration.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const daysBeforeLaunch = calculateDaysBeforeLaunch();
  const qualifiesForGold = daysBeforeLaunch !== null && daysBeforeLaunch > 7;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Contract Verification</h1>
        <p className="text-muted-foreground">
          Bind your logos to contract addresses and earn gold verification badges
        </p>
      </div>

      {/* Gold Verification System Explanation */}
      <Card className="mb-8 border-yellow-500/50 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            Gold Verification System
          </CardTitle>
          <CardDescription>Register before launch, get permanent gold verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <Badge className="mb-2 bg-yellow-500 text-white">Gold Check</Badge>
              <p className="text-sm font-semibold">7+ Days Before Launch</p>
              <p className="text-xs text-muted-foreground mt-1">Ultimate proof of legitimacy</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-400 flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8 text-white" />
              </div>
              <Badge className="mb-2 bg-gray-400 text-white">Silver Check</Badge>
              <p className="text-sm font-semibold">1-7 Days Before</p>
              <p className="text-xs text-muted-foreground mt-1">Pre-launch verification</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <Badge className="mb-2 bg-orange-600 text-white">Standard</Badge>
              <p className="text-sm font-semibold">After Launch</p>
              <p className="text-xs text-muted-foreground mt-1">Basic verification</p>
            </div>
          </div>

          <Alert className="mt-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <Star className="w-4 h-4 text-yellow-600" />
            <AlertTitle>Gold Check Benefits (IPFS/Solturio URLs Only)</AlertTitle>
            <AlertDescription>
              <strong className="text-yellow-600 block mb-2">
                ⚠️ Gold checks ONLY appear when using Solturio/IPFS URLs!
              </strong>
              • Automatic overlay on IPFS images (ipfs.io/ipfs/...) • Won't work with external URLs
              (imgur, cloudinary, etc.) • Priority in DEX verification when using verified URLs •
              Legal priority in IP disputes with blockchain proof • Permanent certificate linked to
              IPFS hash
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Bind Contract to Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Bind Contract to Logo
            </CardTitle>
            <CardDescription>Connect your logo to your smart contract address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logos.length === 0 ? (
              <Alert>
                <AlertDescription>Upload logos first to bind them to contracts</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Logo</Label>
                  <Select
                    onValueChange={(value) => {
                      const logo = logos.find((l) => l.id === value);
                      setSelectedLogo(logo || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a logo to bind" />
                    </SelectTrigger>
                    <SelectContent>
                      {logos.map((logo) => (
                        <SelectItem key={logo.id} value={logo.id}>
                          <div className="flex items-center gap-2">
                            <span>{logo.fileName}</span>
                            <Badge variant="outline" className="text-xs">
                              {new Date(logo.createdAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLogo && (
                  <Dialog open={isBindingDialogOpen} onOpenChange={setIsBindingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Lock className="w-4 h-4 mr-2" />
                        Bind to Contract
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Bind Contract Address</DialogTitle>
                        <DialogDescription>
                          Connect {selectedLogo.fileName} to your smart contract
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Contract Address</Label>
                          <Input
                            placeholder="0x..."
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            data-testid="input-contract-address"
                          />
                        </div>
                        <div>
                          <Label>Deployment/Launch Date</Label>
                          <Input
                            type="date"
                            value={deploymentDate}
                            onChange={(e) => setDeploymentDate(e.target.value)}
                            data-testid="input-deployment-date"
                          />
                        </div>

                        {daysBeforeLaunch !== null && (
                          <Alert className={qualifiesForGold ? "border-yellow-500" : ""}>
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>
                              {qualifiesForGold ? "🏆 Gold Verification!" : "Verification Level"}
                            </AlertTitle>
                            <AlertDescription>
                              Logo registered {daysBeforeLaunch} days before launch.
                              {qualifiesForGold
                                ? " You qualify for GOLD verification!"
                                : daysBeforeLaunch > 0
                                  ? " You qualify for Silver verification."
                                  : " Standard verification only (post-launch)."}
                            </AlertDescription>
                          </Alert>
                        )}

                        <Button
                          className="w-full"
                          onClick={handleBindContract}
                          disabled={
                            !contractAddress || !deploymentDate || bindContractMutation.isPending
                          }
                        >
                          {bindContractMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : qualifiesForGold ? (
                            <Trophy className="w-4 h-4 mr-2" />
                          ) : (
                            <Lock className="w-4 h-4 mr-2" />
                          )}
                          Bind & Verify
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Gold Overlay Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Automatic Gold Overlay
            </CardTitle>
            <CardDescription>Add gold checks to your IPFS images automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-500/50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertTitle>🔑 Critical: Use Solturio/IPFS URLs</AlertTitle>
              <AlertDescription>
                Gold checks ONLY appear when using:
                <ul className="mt-2 ml-4 space-y-1">
                  <li>• IPFS URLs (ipfs.io/ipfs/...)</li>
                  <li>• Solturio verification URLs</li>
                </ul>
                <strong className="block mt-2">External URLs = No gold check!</strong>
                Always use your Solturio-generated URLs to get the gold verification overlay.
              </AlertDescription>
            </Alert>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="secondary">HTML Script</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyOverlayScript}
                  data-testid="button-copy-overlay"
                >
                  {copiedCode ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <pre className="text-xs overflow-x-auto">
                <code>{`<script src="https://cdn.solturio.app/overlay.js"></script>`}</code>
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Features:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Auto-detects IPFS images
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Overlays gold/silver/standard badges
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Links to verification certificate
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Works on all major browsers
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Example */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Gold Check Visual Example</CardTitle>
          <CardDescription>How verified logos appear with gold checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                  LOGO
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16">
                  <img
                    src="/gold-check-badge-solturio.png"
                    alt="Gold Check"
                    className="w-full h-full object-contain filter drop-shadow-lg"
                  />
                </div>
              </div>
              <Badge className="mt-3 bg-yellow-500 text-white">Gold Verified</Badge>
              <p className="text-xs text-muted-foreground mt-1">7+ days pre-launch</p>
              <p className="text-xs font-semibold text-yellow-600 mt-2">IPFS/Solturio URL Only</p>
            </div>

            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                  LOGO
                </div>
                <div className="absolute top-1 right-1">
                  <svg width="24" height="24" className="filter drop-shadow-lg">
                    <circle cx="12" cy="12" r="12" fill="#C0C0C0" stroke="#FFF" strokeWidth="2" />
                    <path
                      d="M6 12 L10 16 L18 8"
                      stroke="white"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <Badge className="mt-2 bg-gray-400 text-white">Silver Verified</Badge>
              <p className="text-xs text-muted-foreground mt-1">Pre-launch</p>
            </div>

            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                  LOGO
                </div>
                <div className="absolute top-1 right-1">
                  <svg width="24" height="24" className="filter drop-shadow-lg">
                    <circle cx="12" cy="12" r="12" fill="#CD7F32" stroke="#FFF" strokeWidth="2" />
                    <path
                      d="M6 12 L10 16 L18 8"
                      stroke="white"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <Badge className="mt-2 bg-orange-600 text-white">Standard</Badge>
              <p className="text-xs text-muted-foreground mt-1">Post-launch</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

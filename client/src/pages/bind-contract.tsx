import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Link2, Download, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Logo } from "@shared/schema";

function getExplorerUrl(chain: string, address: string): { url: string; name: string } {
  switch (chain) {
    case 'solana':
      return { url: `https://solscan.io/token/${address}`, name: 'Solscan' };
    case 'ethereum':
      return { url: `https://etherscan.io/token/${address}`, name: 'Etherscan' };
    case 'base':
      return { url: `https://basescan.org/token/${address}`, name: 'BaseScan' };
    case 'arbitrum':
      return { url: `https://arbiscan.io/token/${address}`, name: 'Arbiscan' };
    case 'polygon':
      return { url: `https://polygonscan.com/token/${address}`, name: 'PolygonScan' };
    default:
      return { url: `https://solscan.io/token/${address}`, name: 'Explorer' };
  }
}

const bindContractSchema = z.object({
  tokenContractAddress: z.string().min(20, "Contract address must be at least 20 characters"),
  tokenContractChain: z.enum(["solana", "ethereum", "base", "arbitrum", "polygon", "other"]),
  tokenPoolAddress: z.string().optional(),
});

type BindContractFormValues = z.infer<typeof bindContractSchema>;

export default function BindContract() {
  const [, params] = useRoute("/bind-contract/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [bindingComplete, setBindingComplete] = useState(false);

  const logoId = params?.id;

  useEffect(() => {
    document.title = "Bind Contract Address - Solturio";
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: logo, isLoading: logoLoading } = useQuery<Logo>({
    queryKey: ["/api/logos", logoId],
    queryFn: async () => {
      const res = await fetch(`/api/logos/${logoId}`);
      if (!res.ok) throw new Error("Logo not found");
      return res.json();
    },
    enabled: !!logoId && isAuthenticated,
  });

  const form = useForm<BindContractFormValues>({
    resolver: zodResolver(bindContractSchema),
    defaultValues: {
      tokenContractChain: "solana",
      tokenContractAddress: "",
      tokenPoolAddress: "",
    },
  });

  const bindMutation = useMutation({
    mutationFn: async (values: BindContractFormValues) => {
      const response = await apiRequest("POST", `/api/logos/${logoId}/bind-contract`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contract Address Bound",
        description: "You can now generate verified media copies with embedded metadata.",
      });
      setBindingComplete(true);
      queryClient.invalidateQueries({ queryKey: ["/api/logos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to bind contract address",
        variant: "destructive",
      });
    },
  });

  const generateVerifiedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/logos/${logoId}/generate-verified-media`, {
        assetTypes: ["logo"],
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification Record Created",
        description: "Your verification manifest is ready for download.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logos", logoId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create verification record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: BindContractFormValues) => {
    bindMutation.mutate(values);
  };

  if (authLoading || logoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !logo) {
    return null;
  }

  const hasContractAddress = !!(logo as any).tokenContractAddress;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/dashboard")}
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bind Contract Address</h1>
        <p className="text-muted-foreground">
          Link your deployed token contract to your original registration and generate a verification manifest.
        </p>
      </div>

      {/* Token Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Token Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">Token Name</span>
              <span className="font-medium">{logo.tokenName || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Ticker</span>
              <span className="font-medium">{logo.tokenTicker || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Registered</span>
              <span className="font-medium">
                {logo.ownershipClaimedAt 
                  ? new Date(logo.ownershipClaimedAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">File Hash</span>
              <code className="text-xs font-mono">{logo.fileHash?.slice(0, 12)}...</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasContractAddress || bindingComplete ? (
        /* Already Bound State */
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle>Contract Address Bound</CardTitle>
            </div>
            <CardDescription>
              Your token contract is linked to this registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Chain</span>
                <Badge>{(logo as any).tokenContractChain || "solana"}</Badge>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Contract Address</span>
                <code className="text-sm font-mono break-all">
                  {(logo as any).tokenContractAddress || form.getValues().tokenContractAddress}
                </code>
              </div>
              {((logo as any).tokenPoolAddress || form.getValues().tokenPoolAddress) && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Pool Address</span>
                  <code className="text-sm font-mono break-all">
                    {(logo as any).tokenPoolAddress || form.getValues().tokenPoolAddress}
                  </code>
                </div>
              )}
              {(() => {
                const ca = (logo as any).tokenContractAddress || form.getValues().tokenContractAddress;
                const chain = (logo as any).tokenContractChain || form.getValues().tokenContractChain || 'solana';
                if (!ca) return null;
                const explorer = getExplorerUrl(chain, ca);
                return (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs gap-1 mt-2"
                    onClick={() => window.open(explorer.url, '_blank')}
                    data-testid="button-view-explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on {explorer.name}
                  </Button>
                );
              })()}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some social platforms strip metadata on upload. Keep your original files and this verification manifest as proof of ownership.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => generateVerifiedMutation.mutate()}
                disabled={generateVerifiedMutation.isPending}
                className="flex-1"
                data-testid="button-generate-verified"
              >
                {generateVerifiedMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Create Verification Record
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/api/logos/${logoId}/download-verified`, '_blank')}
                data-testid="button-download-verified"
              >
                <Download className="w-4 h-4 mr-2" />
                Manifest
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Bind Form */
        <Card>
          <CardHeader>
            <CardTitle>Enter Contract Details</CardTitle>
            <CardDescription>
              After deploying your token, enter the contract address to bind it to your registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tokenContractChain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chain *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-chain">
                            <SelectValue placeholder="Select chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="solana">Solana</SelectItem>
                          <SelectItem value="ethereum">Ethereum</SelectItem>
                          <SelectItem value="base">Base</SelectItem>
                          <SelectItem value="arbitrum">Arbitrum</SelectItem>
                          <SelectItem value="polygon">Polygon</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenContractAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Address *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" 
                          {...field}
                          data-testid="input-contract-address"
                        />
                      </FormControl>
                      <FormDescription>
                        The on-chain token contract address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenPoolAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pool/Pair Address (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="DEX liquidity pool address" 
                          {...field}
                          data-testid="input-pool-address"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Add your DEX pool address for enhanced verification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={bindMutation.isPending}
                  data-testid="button-submit-bind"
                >
                  {bindMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Bind Contract Address
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">What happens when you bind a contract address?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Links your deployed contract to your original registration</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Creates a timestamped verification record with chain, CA, project ID, and file hash</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Download a JSON verification manifest as proof of ownership</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Re-bind later if you migrate to a new contract address</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            Note: Some social platforms strip metadata on upload. Keep your original files and this platform's verification manifest as proof of ownership.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

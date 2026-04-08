/**
 * NFT Minting UI Component
 *
 * Shows minting status and triggers NFT certificate creation
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, AlertTriangle, Loader2, ExternalLink } from "lucide-react";

interface NFTMintingUIProps {
  logoId: string;
  logoName: string;
  logoDescription: string;
  registrationType: "token_launch" | "artwork" | "logo";
  alreadyMinted?: boolean;
  nftAddress?: string;
  explorerUrl?: string;
}

export function NFTMintingUI({
  logoId,
  logoName,
  logoDescription,
  registrationType,
  alreadyMinted,
  nftAddress,
  explorerUrl,
}: NFTMintingUIProps) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const mintMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/nft/mint", {
        logoId,
        logoName,
        logoDescription,
        registrationType,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "NFT Certificate Created!",
          description: `Your IP protection certificate has been minted on the blockchain.`,
        });
      } else {
        toast({
          title: "Minting In Progress",
          description: data.message || "Your NFT is being prepared",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (alreadyMinted && nftAddress) {
    return (
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <CardTitle>NFT Certificate Minted</CardTitle>
            </div>
            <Badge className="bg-green-600 dark:bg-green-700">Minted</Badge>
          </div>
          <CardDescription>
            Your IP protection certificate is secured on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Certificate ID:</span> {nftAddress}
            </p>
          </div>
          {explorerUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(explorerUrl, "_blank")}
              className="gap-2"
              data-testid="button-view-nft"
            >
              <ExternalLink className="w-4 h-4" />
              View on Solscan
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Create IP Protection Certificate</CardTitle>
            <CardDescription>
              Mint an NFT certificate to the blockchain as proof of ownership
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>What This Does</AlertTitle>
          <AlertDescription>
            Creates an immutable NFT certificate on Solana blockchain. Your logo metadata and IPFS
            hash are stored forever, proving your IP ownership with a timestamp.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-2">
            <p className="font-semibold">Certificate Details:</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400 text-xs">
              <li>✓ Logo Name: {logoName}</li>
              <li>
                ✓ Type:{" "}
                {registrationType === "token_launch"
                  ? "Token Launch"
                  : registrationType === "artwork"
                    ? "Artwork"
                    : "Logo"}
              </li>
              <li>✓ Network: Solana Mainnet</li>
              <li>✓ Storage: IPFS + On-Chain</li>
            </ul>
          </div>
        </div>

        {showDetails && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-xs space-y-2">
              <p>
                <strong>How it works:</strong> Your logo file stays in your {logoName}.solturio.sol
                wallet. Only the metadata and IPFS hash are recorded on-chain, creating an immutable
                proof of ownership.
              </p>
              <p>
                <strong>Cost:</strong> Minting requires a small SOL transaction fee (typically
                0.0005 - 0.001 SOL).
              </p>
              <p>
                <strong>Recovery:</strong> Your certificate can be recovered using your wallet
                recovery phrase.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 dark:text-blue-400"
          data-testid="button-toggle-nft-details"
        >
          {showDetails ? "Hide Details" : "Learn More"}
        </Button>

        <Button
          onClick={() => mintMutation.mutate()}
          disabled={mintMutation.isPending}
          className="w-full"
          size="lg"
          data-testid="button-mint-nft"
        >
          {mintMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Certificate...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Mint NFT Certificate
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

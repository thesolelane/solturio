import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Coins, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface WalletTierData {
  tier: "standard" | "premium";
  customName?: string;
}

export default function CeremonyStage2Payment() {
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "verifying" | "complete">("idle");
  const [paymentProgress, setPaymentProgress] = useState(0);

  const { data: walletTier } = useQuery<WalletTierData>({
    queryKey: ["/api/ceremony/wallet-tier"],
  });

  const tier = walletTier?.tier || "standard";
  const amount = tier === "standard" ? "0.1" : "0.15";
  const walletName = tier === "standard" 
    ? "042.solturio.sol" 
    : `${walletTier?.customName || "yourname"}.solturio.sol`;

  const handleInitiatePayment = async () => {
    setPaymentStatus("processing");
    setPaymentProgress(0);

    // Simulate payment processing
    const interval = setInterval(() => {
      setPaymentProgress((prev: number) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    // Simulate blockchain verification
    setTimeout(() => {
      clearInterval(interval);
      setPaymentStatus("verifying");
      setPaymentProgress(95);
    }, 3000);

    setTimeout(() => {
      setPaymentProgress(100);
      setPaymentStatus("complete");
      // Proceed to next stage after brief delay
      setTimeout(() => {
        setLocation("/ceremony/stage-3-pledge");
      }, 1500);
    }, 5000);
  };

  const handleGoBack = () => {
    setLocation("/ceremony/stage-1-warning");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Wallet Creation Payment</CardTitle>
              <CardDescription>Stage 2 of 6: Fund Your Wallet</CardDescription>
            </div>
          </div>
          <Progress value={(2 / 6) * 100} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {paymentStatus === "idle" && (
            <>
              <Alert>
                <Coins className="h-4 w-4" />
                <AlertDescription>
                  This payment covers the Solana network fees for creating your wallet and storing certificates/contracts on-chain.
                </AlertDescription>
              </Alert>

              <div className="p-6 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wallet Tier</span>
                  <Badge variant={tier === "premium" ? "default" : "secondary"}>
                    {tier === "standard" ? "Standard" : "Premium"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wallet Address</span>
                  <span className="font-mono text-sm font-semibold" data-testid="text-wallet-name">
                    {walletName}
                  </span>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Amount Due</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold" data-testid="text-payment-amount">
                        {amount} SOL
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (≈ ${(parseFloat(amount) * 180).toFixed(2)} USD)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-amber-600/5 border border-amber-600/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">What This Payment Covers</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Solana blockchain wallet creation</li>
                      <li>On-chain storage space for your certificates</li>
                      <li>Smart contract deployment capacity</li>
                      <li>IPFS metadata hash storage</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {paymentStatus === "processing" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Processing Payment...</h3>
                  <p className="text-sm text-muted-foreground">
                    Creating your wallet on the Solana blockchain
                  </p>
                </div>
              </div>
              <Progress value={paymentProgress} className="h-3" />
              <p className="text-xs text-center text-muted-foreground">
                This may take 10-30 seconds. Please do not close this window.
              </p>
            </div>
          )}

          {paymentStatus === "verifying" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Verifying Transaction...</h3>
                  <p className="text-sm text-muted-foreground">
                    Confirming on Solana blockchain
                  </p>
                </div>
              </div>
              <Progress value={paymentProgress} className="h-3" />
            </div>
          )}

          {paymentStatus === "complete" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg text-green-600">Payment Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    Wallet <span className="font-mono font-semibold">{walletName}</span> created successfully
                  </p>
                </div>
              </div>
              <Progress value={100} className="h-3" />
              <p className="text-xs text-center text-muted-foreground">
                Proceeding to next stage...
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleGoBack}
            disabled={paymentStatus !== "idle"}
            data-testid="button-go-back"
          >
            Go Back
          </Button>
          {paymentStatus === "idle" && (
            <Button
              onClick={handleInitiatePayment}
              data-testid="button-initiate-payment"
              className="min-w-[200px]"
            >
              <Coins className="mr-2 h-4 w-4" />
              Pay {amount} SOL & Create Wallet
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

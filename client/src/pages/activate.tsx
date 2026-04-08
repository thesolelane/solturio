import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Coins,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Sparkles,
  Shield,
  Clock,
  Zap,
} from "lucide-react";

interface SubscriptionInfo {
  status: "active" | "pending" | "expired";
  expiresAt?: string;
  isAdmin: boolean;
  isPromo: boolean;
}

interface PaymentInfo {
  recipientWallet: string;
  cathAmount: string;
  solEquivalent: string;
  isPromo: boolean;
  instructions: string;
}

export default function ActivatePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [paymentStep, setPaymentStep] = useState<"info" | "payment" | "verifying" | "complete">(
    "info"
  );
  const [transactionSignature, setTransactionSignature] = useState("");

  useEffect(() => {
    document.title = "Activate Account - Solturio";
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to activate your account.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: subscriptionInfo, isLoading: subscriptionLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const { data: paymentInfo, isLoading: paymentLoading } = useQuery<PaymentInfo>({
    queryKey: ["/api/subscription/payment-info"],
    enabled: isAuthenticated && subscriptionInfo?.status === "pending",
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (txSignature: string) => {
      const response = await apiRequest("POST", "/api/subscription/verify-payment", {
        transactionSignature: txSignature,
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Payment Verified!", description: "Your account is now active for 1 year." });
      setPaymentStep("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setTimeout(() => setLocation("/dashboard"), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify payment. Please try again.",
        variant: "destructive",
      });
      setPaymentStep("payment");
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${label} copied to clipboard` });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleVerifyPayment = () => {
    if (!transactionSignature.trim()) {
      toast({
        title: "Missing Signature",
        description: "Please enter your transaction signature",
        variant: "destructive",
      });
      return;
    }
    setPaymentStep("verifying");
    verifyPaymentMutation.mutate(transactionSignature);
  };

  if (authLoading || subscriptionLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-16 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (subscriptionInfo?.isAdmin) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Shield className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Admin Account</CardTitle>
            <CardDescription>
              Your account has unlimited access as an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Badge className="bg-amber-500 text-lg px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Unlimited Access
            </Badge>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation("/dashboard")} data-testid="button-go-dashboard">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (subscriptionInfo?.status === "active") {
    const expiresAt = subscriptionInfo.expiresAt ? new Date(subscriptionInfo.expiresAt) : null;
    const daysRemaining = expiresAt
      ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Account Active</CardTitle>
            <CardDescription>Your platform access is active and ready to use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="default" className="bg-green-500 text-lg px-4 py-2">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Active
              </Badge>
            </div>
            {expiresAt && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Expires: {expiresAt.toLocaleDateString()}
                </p>
                <p className="text-sm font-medium">{daysRemaining} days remaining</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation("/dashboard")} data-testid="button-go-dashboard">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (subscriptionInfo?.status === "expired") {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-amber-500/10">
                <AlertCircle className="h-12 w-12 text-amber-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Subscription Expired</CardTitle>
            <CardDescription>
              Your platform access has expired. Renew to continue protecting your IP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your existing registrations are preserved. Renew to add new protections.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => setPaymentStep("payment")} data-testid="button-renew">
              Renew Subscription
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Coins className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Activate Your Account</CardTitle>
              <CardDescription>Pay with $CATH to unlock 1 year of IP protection</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {paymentStep === "info" && (
            <>
              {paymentInfo?.isPromo && (
                <Alert className="border-green-500/50 bg-green-500/5">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-600">
                    <strong>Early Adopter Special!</strong> You're eligible for the launch promotion
                    price.
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-6 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant={paymentInfo?.isPromo ? "default" : "secondary"}>
                    {paymentInfo?.isPromo ? "Launch Promo" : "Standard"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-semibold">1 Year Access</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Amount Due</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid="text-payment-amount">
                      {paymentInfo?.solEquivalent || "0.14"} SOL worth
                    </div>
                    <div className="text-sm text-muted-foreground">in $CATH tokens</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">What You Get</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Upload and protect unlimited logos</li>
                      <li>Blockchain-verified ownership certificates</li>
                      <li>Create license smart contracts (SOL fee per contract)</li>
                      <li>Earn $SOLT rewards for platform actions</li>
                      <li>DEX anti-copycat verification</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Non-refundable.</strong> This is a service fee for platform access. All
                  payments are final and non-refundable.
                </AlertDescription>
              </Alert>
            </>
          )}

          {paymentStep === "payment" && paymentInfo && (
            <>
              <div className="p-6 border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-semibold">Payment Instructions</h4>
                <p className="text-sm text-muted-foreground">
                  Send the exact amount of $CATH tokens to the platform wallet, then paste your
                  transaction signature below.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div>
                      <p className="text-xs text-muted-foreground">Send To</p>
                      <code className="text-sm font-mono" data-testid="text-recipient-wallet">
                        {paymentInfo.recipientWallet}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentInfo.recipientWallet, "Wallet address")}
                      data-testid="button-copy-wallet"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount ($CATH)</p>
                      <code className="text-lg font-mono font-bold" data-testid="text-cath-amount">
                        {paymentInfo.cathAmount}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentInfo.cathAmount, "Amount")}
                      data-testid="button-copy-amount"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Signature</label>
                  <input
                    type="text"
                    placeholder="Paste your Solana transaction signature..."
                    value={transactionSignature}
                    onChange={(e) => setTransactionSignature(e.target.value)}
                    className="w-full p-3 border rounded-lg font-mono text-sm"
                    data-testid="input-transaction-signature"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your wallet after sending the transaction
                  </p>
                </div>
              </div>

              <Alert className="border-amber-500/50 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription>
                  Make sure to send from your connected wallet: {user?.walletAddress?.slice(0, 8)}
                  ...
                </AlertDescription>
              </Alert>
            </>
          )}

          {paymentStep === "verifying" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Verifying Payment...</h3>
                  <p className="text-sm text-muted-foreground">
                    Checking transaction on Solana blockchain
                  </p>
                </div>
              </div>
              <Progress value={60} className="h-3" />
            </div>
          )}

          {paymentStep === "complete" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Account Activated!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your 1-year platform access is now active
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <Badge className="bg-green-500 text-lg px-4 py-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Active for 365 days
                </Badge>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-4">
          {paymentStep === "info" && (
            <>
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setPaymentStep("payment")}
                data-testid="button-proceed-payment"
              >
                <Coins className="w-4 h-4 mr-2" />
                Proceed to Payment
              </Button>
            </>
          )}

          {paymentStep === "payment" && (
            <>
              <Button
                variant="outline"
                onClick={() => setPaymentStep("info")}
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyPayment}
                disabled={!transactionSignature.trim() || verifyPaymentMutation.isPending}
                data-testid="button-verify-payment"
              >
                {verifyPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verify Payment
                  </>
                )}
              </Button>
            </>
          )}

          {paymentStep === "complete" && (
            <Button
              className="w-full"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-go-dashboard"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

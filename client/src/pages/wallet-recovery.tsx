import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Clock, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function WalletRecovery() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [walletName, setWalletName] = useState("");
  const { toast } = useToast();

  const requestRecoveryMutation = useMutation({
    mutationFn: async (data: { email: string; walletName: string }) => {
      return await apiRequest("/api/wallet/recovery-request", "POST", data);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address (e.g., name@domain.com)");
      return;
    }

    try {
      await requestRecoveryMutation.mutateAsync({ email, walletName });
      toast({
        title: "Recovery Request Submitted",
        description: "Our team will contact you within 24-48 hours with recovery instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit recovery request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold">Wallet Recovery Service</h1>
            <p className="text-lg text-muted-foreground">
              Lost access to your xxx.solturio.sol wallet? We can help.
            </p>
          </div>

          <Alert className="border-primary bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription>
              <span className="font-semibold">Your certificates are safe.</span> Since your wallet
              holds legal documents (not financial assets), we can recover it with proper identity
              verification.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">$100 Fee</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  One-time recovery fee paid in SOL, BONK, or CATH cryptocurrency.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">24-48 Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Recovery requests processed within 1-2 business days after verification.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">ID Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Verify identity via your Replit, GitHub, or Google account.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>4 simple steps to recover your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">Submit Request</h4>
                  <p className="text-sm text-muted-foreground">
                    Fill out the form below with your registered email and wallet subdomain.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">Identity Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Verify your identity by logging in with the same provider you registered with
                    (Replit/GitHub/Google).
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">Payment</h4>
                  <p className="text-sm text-muted-foreground">
                    Pay the $100 recovery fee in SOL, BONK, or CATH to the provided wallet address.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">Receive New Recovery Phrase</h4>
                  <p className="text-sm text-muted-foreground">
                    Once verified and payment confirmed, receive your new 12-word recovery phrase
                    via secure email.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Wallet Recovery</CardTitle>
              <CardDescription>Start your recovery process</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Registered Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    onBlur={() => {
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setEmailError("Enter a valid email address (e.g., name@domain.com)");
                      } else {
                        setEmailError("");
                      }
                    }}
                    required
                    data-testid="input-recovery-email"
                  />
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                  <p className="text-xs text-muted-foreground">
                    Must match the email on your Solturio account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet-name">Wallet Subdomain</Label>
                  <Input
                    id="wallet-name"
                    type="text"
                    placeholder="yourname or 042"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    required
                    data-testid="input-wallet-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your wallet subdomain (e.g., "dragoncoin" for dragoncoin.solturio.sol)
                  </p>
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">Important:</span> Recovery may be denied if
                    identity verification fails or if fraudulent activity is detected. The $100 fee
                    is non-refundable once processing begins.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestRecoveryMutation.isPending}
                  data-testid="button-submit-recovery"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {requestRecoveryMutation.isPending ? "Submitting..." : "Submit Recovery Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Why Save Your Recovery Phrase?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">FREE & Instant:</span> Writing down
                your 12-word phrase takes 2 minutes and costs nothing.
              </p>
              <p>
                <span className="font-semibold text-foreground">No Waiting:</span> Immediate access
                to your wallet anytime, no 24-48 hour delay.
              </p>
              <p>
                <span className="font-semibold text-foreground">Save $100:</span> Recovery service
                is for emergencies only. Keep your phrase safe and avoid the fee entirely.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

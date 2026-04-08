import { useState } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function CeremonyStage6Terms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [ceremonyComplete, setCeremonyComplete] = useState(false);

  const completeCeremonyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/ceremony/complete", "POST", {});
    },
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isAtBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleComplete = async () => {
    try {
      await completeCeremonyMutation.mutateAsync();
      setCeremonyComplete(true);
      toast({
        title: "Wallet Creation Complete!",
        description: "Your Solturio wallet is ready to use.",
      });
      // Redirect to dashboard after brief delay
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete ceremony. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoBack = () => {
    setLocation("/ceremony/stage-5-verification");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="border-primary">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Final Terms & Agreement</CardTitle>
              <CardDescription>Stage 6 of 6: Legal Acknowledgment</CardDescription>
            </div>
          </div>
          <Progress value={100} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {!ceremonyComplete ? (
            <>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Wallet Security Agreement</h3>
                <ScrollArea
                  className="h-[400px] w-full rounded-lg border p-6 bg-muted/20"
                  onScrollCapture={handleScroll}
                  data-testid="scroll-terms"
                >
                  <div className="prose prose-sm max-w-none dark:prose-invert space-y-4">
                    <h4 className="font-semibold text-base">
                      1. Wallet Purpose & Recovery Service
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I acknowledge that my xxx.solturio.sol wallet is a{" "}
                      <span className="font-semibold">certificate storage wallet</span> designed to
                      hold legal documents, IP certificates, smart contracts, and IPFS metadata
                      hashes—<span className="font-semibold">not financial assets</span>. Because
                      this wallet contains legal documents rather than money, Solturio offers a{" "}
                      <span className="font-semibold">$100 recovery service</span>
                      requiring identity verification (via Replit, GitHub, or Google authentication)
                      with a 24-48 hour processing time.
                    </p>

                    <h4 className="font-semibold text-base">2. Recovery Phrase Best Practice</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      While recovery is available, I understand that{" "}
                      <span className="font-semibold">
                        writing down my 12-word recovery phrase is FREE and instant
                      </span>
                      . The recovery service is for emergencies only. I accept responsibility for
                      securing my recovery phrase to avoid the $100 fee and 2-day wait.
                    </p>

                    <h4 className="font-semibold text-base">3. Recovery Service Terms</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I understand that the recovery service requires: (a) payment of $100 in
                      cryptocurrency, (b) identity verification matching my registered
                      authentication provider, (c) 24-48 hour processing time, and (d) may be denied
                      if identity cannot be verified or if fraudulent activity is suspected.
                    </p>

                    <h4 className="font-semibold text-base">4. Wallet Restrictions</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I acknowledge that my xxx.solturio.sol wallet is a{" "}
                      <span className="font-semibold">restricted wallet</span> that programmatically
                      rejects or burns any SPL tokens sent to it. This wallet only accepts
                      Solturio-generated certificates, smart contracts, and IPFS metadata hashes.
                    </p>

                    <h4 className="font-semibold text-base">5. Documentation and Audit Trail</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I understand that the Key Handover Ceremony I have just completed creates a
                      permanent legal audit trail documenting my full understanding of wallet
                      security requirements and my acceptance of personal responsibility.
                    </p>

                    <h4 className="font-semibold text-base">6. Limited Liability</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I understand that Solturio provides reasonable recovery services but cannot
                      guarantee successful recovery in all cases. I hereby{" "}
                      <span className="font-semibold">release and discharge</span> Solturio from
                      liability for:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                      <li>Delays in recovery service beyond the estimated 24-48 hour timeframe</li>
                      <li>Denial of recovery requests due to failed identity verification</li>
                      <li>Loss of certificates or contracts if recovery is unsuccessful</li>
                      <li>Any consequences of choosing not to save my recovery phrase</li>
                    </ul>

                    <h4 className="font-semibold text-base">
                      7. Security Best Practices Acknowledgment
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I confirm that I have been instructed to write my recovery phrase on physical
                      paper using pen and ink, to store this paper in a secure location (such as a
                      fireproof safe or safety deposit box), and to never photograph, screenshot, or
                      digitally record these words.
                    </p>

                    <h4 className="font-semibold text-base">8. Verification Confirmation</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I confirm that I have successfully completed the verification gauntlet,
                      proving that I have correctly written down and can access my recovery phrase.
                    </p>

                    <h4 className="font-semibold text-base">9. Legal Agreement</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      By accepting these terms, I acknowledge that I have read, understood, and
                      agree to be legally bound by all provisions of this agreement. I understand
                      that this agreement creates enforceable legal obligations and protections for
                      both myself and Solturio.
                    </p>

                    <h4 className="font-semibold text-base">10. Timestamp and Record</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This agreement is timestamped and recorded on the blockchain, creating an
                      immutable record of my acceptance of these terms as of{" "}
                      {new Date().toLocaleString()}.
                    </p>

                    <div className="pt-6 border-t mt-6">
                      <p className="text-xs text-muted-foreground italic">
                        Last Updated: November 5, 2025 • Solturio Platform v1.0
                      </p>
                    </div>
                  </div>
                </ScrollArea>

                {!scrolledToBottom && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please scroll to the bottom to read all terms
                  </p>
                )}
              </div>

              <div className="pt-6 border-t">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    disabled={!scrolledToBottom}
                    data-testid="checkbox-accept-terms"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm leading-relaxed cursor-pointer font-semibold"
                    data-testid="label-accept-terms"
                  >
                    I have read and agree to all terms and conditions above. I understand that
                    recovery is available for $100 + ID verification, but I will save my recovery
                    phrase to avoid this fee.
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center gap-2 justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-2xl">Ceremony Complete!</h3>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your Solturio wallet has been created and secured successfully.
                  </p>
                </div>
              </div>
              <div className="p-6 border rounded-lg bg-primary/5 space-y-3 text-center">
                <h4 className="font-semibold">What's Next?</h4>
                <p className="text-sm text-muted-foreground">
                  You can now upload your first logo or artwork to receive blockchain-verified proof
                  of ownership and protection.
                </p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Redirecting to dashboard...
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          {!ceremonyComplete && (
            <>
              <Button variant="outline" onClick={handleGoBack} data-testid="button-go-back">
                Go Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!acceptedTerms || !scrolledToBottom}
                data-testid="button-complete-ceremony"
                className="min-w-[200px]"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Complete Wallet Setup
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

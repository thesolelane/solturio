import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function CeremonyStage6Terms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [ceremonyComplete, setCeremonyComplete] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isAtBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleComplete = () => {
    setCeremonyComplete(true);
    toast({
      title: "Wallet Creation Complete!",
      description: "Your Solturio wallet is ready to use.",
    });
    // Redirect to dashboard after brief delay
    setTimeout(() => {
      setLocation("/dashboard");
    }, 2000);
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
                    <h4 className="font-semibold text-base">1. Zero Recovery Policy</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I acknowledge and agree that Solturio operates under a strict <span className="font-semibold">Zero Recovery Policy</span>. 
                      This means that Solturio does not store, back up, have access to, or possess any means of recovering 
                      my wallet's private keys or recovery phrase.
                    </p>

                    <h4 className="font-semibold text-base">2. Sole Responsibility for Security</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I accept <span className="font-semibold">full and sole responsibility</span> for securing my 12-word recovery phrase. 
                      I understand that this phrase is the only method to recover my wallet, and that losing it will result 
                      in permanent, irreversible loss of access to my wallet and all its contents.
                    </p>

                    <h4 className="font-semibold text-base">3. No Customer Support for Recovery</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I understand that Solturio's customer support team <span className="font-semibold">cannot and will not</span> assist 
                      with wallet recovery under any circumstances. There are no exceptions, regardless of the value 
                      of assets in the wallet or the circumstances of loss.
                    </p>

                    <h4 className="font-semibold text-base">4. Wallet Restrictions</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I acknowledge that my xxx.solturio.sol wallet is a <span className="font-semibold">restricted wallet</span> that 
                      programmatically rejects or burns any SPL tokens sent to it. This wallet only accepts Solturio-generated 
                      certificates, smart contracts, and IPFS metadata hashes.
                    </p>

                    <h4 className="font-semibold text-base">5. Documentation and Audit Trail</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I understand that the Key Handover Ceremony I have just completed creates a permanent legal audit trail 
                      documenting my full understanding of wallet security requirements and my acceptance of personal responsibility.
                    </p>

                    <h4 className="font-semibold text-base">6. Release of Liability</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I hereby <span className="font-semibold">release, waive, and forever discharge</span> Solturio, its officers, 
                      employees, agents, and affiliates from any and all claims, liabilities, demands, or causes of action 
                      arising from or related to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                      <li>Loss of access to my wallet due to lost recovery phrase</li>
                      <li>Inability to recover my wallet through any means</li>
                      <li>Loss of assets, certificates, or contracts stored in my wallet</li>
                      <li>Any consequences resulting from my failure to secure my recovery phrase</li>
                    </ul>

                    <h4 className="font-semibold text-base">7. Security Best Practices Acknowledgment</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I confirm that I have been instructed to write my recovery phrase on physical paper using pen and ink, 
                      to store this paper in a secure location (such as a fireproof safe or safety deposit box), and to 
                      never photograph, screenshot, or digitally record these words.
                    </p>

                    <h4 className="font-semibold text-base">8. Verification Confirmation</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      I confirm that I have successfully completed the verification gauntlet, proving that I have correctly 
                      written down and can access my recovery phrase.
                    </p>

                    <h4 className="font-semibold text-base">9. Legal Agreement</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      By accepting these terms, I acknowledge that I have read, understood, and agree to be legally bound 
                      by all provisions of this agreement. I understand that this agreement creates enforceable legal 
                      obligations and protections for both myself and Solturio.
                    </p>

                    <h4 className="font-semibold text-base">10. Timestamp and Record</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This agreement is timestamped and recorded on the blockchain, creating an immutable record of my 
                      acceptance of these terms as of {new Date().toLocaleString()}.
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
                    I have read and agree to all terms and conditions above. I accept full responsibility 
                    for my wallet security and release Solturio from any liability for wallet recovery.
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
                  You can now upload your first logo or artwork to receive blockchain-verified 
                  proof of ownership and protection.
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
              <Button
                variant="outline"
                onClick={handleGoBack}
                data-testid="button-go-back"
              >
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

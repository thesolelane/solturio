import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldAlert, Lock, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CeremonyStage1Warning() {
  const [, setLocation] = useLocation();
  const [agreedToWarnings, setAgreedToWarnings] = useState(false);

  const handleProceed = () => {
    setLocation("/ceremony/stage-2-payment");
  };

  const handleCancel = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="border-destructive">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl">Wallet Security Warning</CardTitle>
              <CardDescription>Stage 1 of 6: Critical Information</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              READ THIS CAREFULLY - Your wallet security depends on understanding these warnings
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <Lock className="h-6 w-6 text-destructive shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Zero Recovery Policy</h3>
                <p className="text-sm text-muted-foreground">
                  Solturio <span className="font-bold text-destructive">NEVER</span> stores, backs up, or has the ability to recover your wallet. 
                  If you lose your 12-word recovery phrase, your wallet and all contents are <span className="font-bold">permanently lost forever</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <XCircle className="h-6 w-6 text-destructive shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">No Customer Support for Lost Wallets</h3>
                <p className="text-sm text-muted-foreground">
                  Our support team <span className="font-bold text-destructive">cannot</span> help you recover a lost wallet. 
                  There are no "forgot password" options, no email recovery, and no backup keys.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Your Responsibility</h3>
                <p className="text-sm text-muted-foreground">
                  You will receive a <span className="font-bold">12-word recovery phrase</span> that you must write down on paper (no screenshots allowed). 
                  This phrase is the <span className="font-bold">ONLY</span> way to recover your wallet. Keep it safe, keep it secret, and keep it offline.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-amber-600/20 rounded-lg bg-amber-600/5">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-amber-600">Wallet Restrictions</h3>
                <p className="text-sm text-muted-foreground">
                  Your xxx.solturio.sol wallet is <span className="font-bold">restricted</span>. It will automatically reject or burn any SPL tokens sent to it. 
                  This wallet ONLY accepts Solturio-generated certificates, smart contracts, and IPFS metadata hashes.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="flex items-start gap-3">
              <Checkbox
                id="agree-warnings"
                checked={agreedToWarnings}
                onCheckedChange={(checked) => setAgreedToWarnings(checked === true)}
                data-testid="checkbox-agree-warnings"
              />
              <label
                htmlFor="agree-warnings"
                className="text-sm leading-relaxed cursor-pointer"
                data-testid="label-agree-warnings"
              >
                I understand that Solturio has <span className="font-bold">ZERO ability to recover my wallet</span>, 
                and I take full responsibility for securing my 12-word recovery phrase. I acknowledge that losing this phrase 
                means permanent loss of my wallet and all contents.
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid="button-cancel-ceremony"
          >
            Cancel Setup
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!agreedToWarnings}
            data-testid="button-proceed-to-payment"
            className="min-w-[200px]"
          >
            I Understand - Proceed to Payment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

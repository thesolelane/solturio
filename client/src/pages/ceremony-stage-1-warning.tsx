import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldAlert, Lock, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CeremonyStage1Warning() {
  const [, setLocation] = useLocation();
  const [agreedToWarnings, setAgreedToWarnings] = useState(false);
  const { toast } = useToast();

  const recordStageMutation = useMutation({
    mutationFn: async (data: { stage: string; data?: any }) => {
      return await apiRequest("/api/ceremony/stage", "POST", data);
    },
  });

  const handleProceed = async () => {
    try {
      await recordStageMutation.mutateAsync({
        stage: "warning",
        data: { agreedToWarnings: true },
      });
      setLocation("/ceremony/stage-2-payment");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record your acceptance. Please try again.",
        variant: "destructive",
      });
    }
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
            <div className="flex gap-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
              <Lock className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Recovery Service Available</h3>
                <p className="text-sm text-muted-foreground">
                  Your xxx.solturio.sol wallet holds <span className="font-bold">certificates and legal documents</span>, not financial assets. 
                  If you lose access, Solturio offers a <span className="font-bold text-primary">$100 recovery service</span> with identity verification 
                  (Replit, GitHub, or Google auth). Recovery takes 24-48 hours.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-amber-600/20 rounded-lg bg-amber-600/5">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-amber-600">Save Your Recovery Phrase Anyway</h3>
                <p className="text-sm text-muted-foreground">
                  While recovery is available, <span className="font-bold">writing down your 12-word phrase is FREE and instant</span>. 
                  The recovery service is for emergencies only. Save yourself $100 and 2 days by keeping your phrase safe!
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Your Responsibility</h3>
                <p className="text-sm text-muted-foreground">
                  You will receive a <span className="font-bold">12-word recovery phrase</span> that you must write down on paper (no screenshots allowed). 
                  This phrase is the <span className="font-bold">best way</span> to recover your wallet instantly and for free. Keep it safe, keep it secret, and keep it offline.
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
                I understand that my xxx.solturio.sol wallet holds certificates and legal documents. 
                I will <span className="font-bold">write down my 12-word recovery phrase</span> to avoid paying the $100 recovery fee. 
                I acknowledge that my wallet is restricted and will reject all SPL tokens and financial assets.
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
            disabled={!agreedToWarnings || recordStageMutation.isPending}
            data-testid="button-proceed-to-payment"
            className="min-w-[200px]"
          >
            {recordStageMutation.isPending ? "Recording..." : "I Understand - Proceed to Payment"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

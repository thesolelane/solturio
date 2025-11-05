import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CeremonyStage3Pledge() {
  const [, setLocation] = useLocation();
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const { toast } = useToast();

  const recordStageMutation = useMutation({
    mutationFn: async (data: { stage: string; data?: any }) => {
      return await apiRequest("/api/ceremony/stage", "POST", data);
    },
  });

  const handleProceed = async () => {
    try {
      await recordStageMutation.mutateAsync({
        stage: "pledge",
        data: { pledgeAccepted: true },
      });
      setLocation("/ceremony/stage-4-reveal");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record your pledge. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoBack = () => {
    setLocation("/ceremony/stage-2-payment");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="border-primary">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">The Sacred Pledge</CardTitle>
              <CardDescription>Stage 3 of 6: Your Commitment</CardDescription>
            </div>
          </div>
          <Progress value={(3 / 6) * 100} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-6 border-2 border-primary/30 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 space-y-4">
            <div className="flex items-center gap-2 justify-center mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Your Solemn Promise</h3>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-center italic leading-relaxed">
                "I solemnly acknowledge and accept that the 12-word recovery phrase 
                about to be revealed to me is the <span className="font-bold not-italic">sole and exclusive</span> means 
                of accessing my Solturio wallet.
              </p>

              <p className="text-center italic leading-relaxed">
                I understand that <span className="font-bold not-italic">no person, organization, or technology</span> can 
                recover my wallet if I lose this phrase. Not Solturio, not blockchain forensics, 
                not customer support, and not any government authority.
              </p>

              <p className="text-center italic leading-relaxed">
                I commit to <span className="font-bold not-italic">writing these words on physical paper</span> using 
                pen and ink, storing this paper in a secure location known only to me, 
                and <span className="font-bold not-italic">never photographing or digitally recording</span> these words.
              </p>

              <p className="text-center italic leading-relaxed">
                I accept <span className="font-bold not-italic">full and complete responsibility</span> for the security 
                of my recovery phrase and release Solturio from any liability 
                for losses resulting from my failure to secure it properly."
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold text-sm">This Pledge Creates Legal Protection For:</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Establishing your full understanding of wallet security requirements</li>
              <li>Documenting your acceptance of personal responsibility</li>
              <li>Creating an audit trail that protects both you and Solturio</li>
              <li>Preventing future disputes about wallet recovery expectations</li>
            </ul>
          </div>

          <div className="pt-6 border-t">
            <div className="flex items-start gap-3">
              <Checkbox
                id="accept-pledge"
                checked={pledgeAccepted}
                onCheckedChange={(checked) => setPledgeAccepted(checked === true)}
                data-testid="checkbox-accept-pledge"
              />
              <label
                htmlFor="accept-pledge"
                className="text-sm leading-relaxed cursor-pointer font-semibold"
                data-testid="label-accept-pledge"
              >
                I accept this sacred pledge and understand that by checking this box, 
                I am creating a permanent legal record of my commitment to secure my wallet.
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleGoBack}
            data-testid="button-go-back"
          >
            Go Back
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!pledgeAccepted || recordStageMutation.isPending}
            data-testid="button-proceed-to-reveal"
            className="min-w-[200px]"
          >
            {recordStageMutation.isPending ? "Recording..." : "I Accept - Reveal Recovery Phrase"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

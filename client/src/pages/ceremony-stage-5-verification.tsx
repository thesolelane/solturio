import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Shield, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function CeremonyStage5Verification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Mock recovery phrase (in production, comes from backend session)
  const correctPhrase = [
    "abandon", "ability", "able", "about", "above", "absent",
    "absorb", "abstract", "absurd", "abuse", "access", "accident"
  ];

  // Generate 3 random word positions (1-12)
  const [randomPositions] = useState(() => {
    const positions: number[] = [];
    while (positions.length < 3) {
      const num = Math.floor(Math.random() * 12) + 1;
      if (!positions.includes(num)) {
        positions.push(num);
      }
    }
    return positions.sort((a, b) => a - b);
  });

  const [userInputs, setUserInputs] = useState<Record<number, string>>({});
  const [attempts, setAttempts] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "failed">("pending");
  const maxAttempts = 3;

  const handleVerify = () => {
    const allCorrect = randomPositions.every((pos: number) => {
      const userWord = userInputs[pos]?.trim().toLowerCase();
      const correctWord = correctPhrase[pos - 1];
      return userWord === correctWord;
    });

    if (allCorrect) {
      setVerificationStatus("success");
      toast({
        title: "Verification Successful!",
        description: "You've correctly verified your recovery phrase.",
      });
      // Proceed to next stage after brief delay
      setTimeout(() => {
        setLocation("/ceremony/stage-6-terms");
      }, 2000);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        setVerificationStatus("failed");
        toast({
          title: "Verification Failed",
          description: "Maximum attempts exceeded. You must restart the ceremony.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Incorrect Words",
          description: `${maxAttempts - newAttempts} attempt(s) remaining. Please check your written phrase.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleRestart = () => {
    setLocation("/ceremony/stage-1-warning");
  };

  const handleGoBack = () => {
    setLocation("/ceremony/stage-4-reveal");
  };

  const isFormValid = randomPositions.every((pos: number) => 
    userInputs[pos]?.trim().length > 0
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className={verificationStatus === "failed" ? "border-destructive" : "border-primary"}>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              verificationStatus === "failed" ? "bg-destructive/10" : "bg-primary/10"
            }`}>
              <Shield className={`h-8 w-8 ${
                verificationStatus === "failed" ? "text-destructive" : "text-primary"
              }`} />
            </div>
            <div>
              <CardTitle className="text-2xl">Verification Gauntlet</CardTitle>
              <CardDescription>Stage 5 of 6: Prove You Wrote It Down</CardDescription>
            </div>
          </div>
          <Progress value={(5 / 6) * 100} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {verificationStatus === "pending" && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Enter the exact words from your written recovery phrase. 
                  You have <span className="font-bold">{maxAttempts - attempts} attempt(s)</span> remaining.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">Enter these specific words from your recovery phrase:</h3>
                
                {randomPositions.map((position: number) => (
                  <div key={position} className="space-y-2">
                    <Label htmlFor={`word-${position}`} className="text-base">
                      Word #{position}
                    </Label>
                    <Input
                      id={`word-${position}`}
                      type="text"
                      placeholder={`Enter word #${position}`}
                      value={userInputs[position] || ""}
                      onChange={(e) => setUserInputs({
                        ...userInputs,
                        [position]: e.target.value
                      })}
                      className="font-mono text-lg"
                      data-testid={`input-word-${position}`}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>

              {attempts > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Previous attempt failed. Double-check your written phrase and try again.
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 bg-muted/30 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Why we do this:</span> This verification ensures you 
                  actually wrote down your recovery phrase. If you can't verify it now, you won't be 
                  able to recover your wallet later.
                </p>
              </div>
            </>
          )}

          {verificationStatus === "success" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-green-500/10">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg text-green-600">Verification Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    You've proven you have your recovery phrase secured.
                  </p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Proceeding to final stage...
              </p>
            </div>
          )}

          {verificationStatus === "failed" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg text-destructive">Verification Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    You've used all {maxAttempts} attempts. You must restart the ceremony 
                    and write down your recovery phrase more carefully.
                  </p>
                </div>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-semibold">This is for your protection.</span> If you can't verify 
                  your recovery phrase now, you won't be able to recover your wallet if you lose access to it.
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                onClick={handleRestart}
                className="w-full"
                data-testid="button-restart-ceremony"
              >
                Restart Ceremony from Beginning
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          {verificationStatus === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={handleGoBack}
                data-testid="button-go-back"
              >
                Go Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={!isFormValid}
                data-testid="button-verify-words"
                className="min-w-[200px]"
              >
                Verify Recovery Phrase
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

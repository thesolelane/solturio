import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, Key, AlertTriangle, Camera, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function CeremonyStage4Reveal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [revealed, setRevealed] = useState(false);
  const [secondsViewed, setSecondsViewed] = useState(0);

  const { data: phraseData, isLoading, error, refetch } = useQuery<{ words: string[]; warning: string }>({
    queryKey: ['/api/ceremony/recovery-phrase'],
    enabled: revealed,
    staleTime: Infinity,
    retry: false,
  });

  const recoveryPhrase = phraseData?.words || [];

  useEffect(() => {
    if (!revealed) return;

    const interval = setInterval(() => {
      setSecondsViewed((prev: number) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [revealed]);

  const handleReveal = async () => {
    setRevealed(true);
    await refetch();
  };

  const handleProceed = () => {
    if (secondsViewed < 10) {
      toast({
        title: "Please Read Carefully",
        description: "Take time to write down all 12 words before proceeding.",
        variant: "destructive",
      });
      return;
    }
    setLocation("/ceremony/stage-5-verification");
  };

  const handleGoBack = () => {
    setLocation("/ceremony/stage-3-pledge");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="border-amber-600">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-600/10">
              <Key className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Recovery Phrase Revelation</CardTitle>
              <CardDescription>Stage 4 of 6: Write This Down NOW</CardDescription>
            </div>
          </div>
          <Progress value={(4 / 6) * 100} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              YOU WILL ONLY SEE THIS ONCE - Write these 12 words on paper with pen. NO screenshots!
            </AlertDescription>
          </Alert>

          {!revealed ? (
            <div className="space-y-6">
              <div className="p-6 border-2 border-amber-600/30 rounded-lg bg-amber-600/5 space-y-4">
                <div className="flex items-start gap-3">
                  <Camera className="h-6 w-6 text-destructive shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-destructive">NO SCREENSHOTS ALLOWED</h3>
                    <p className="text-sm text-muted-foreground">
                      Digital copies can be hacked, stolen, or accidentally shared. 
                      Paper stored securely cannot be remotely accessed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-muted/30 border rounded-lg">
                <h4 className="font-semibold">Before Revealing:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Get a pen and paper ready</li>
                  <li>Ensure you're in a private location</li>
                  <li>Make sure no one can see your screen</li>
                  <li>No cameras or recording devices nearby</li>
                  <li>You have 5+ minutes of uninterrupted time</li>
                </ol>
              </div>

              <Button
                onClick={handleReveal}
                size="lg"
                className="w-full"
                data-testid="button-reveal-phrase"
              >
                <Eye className="mr-2 h-5 w-5" />
                I'm Ready - Reveal My Recovery Phrase
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Decrypting your recovery phrase...</p>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to retrieve recovery phrase. Please ensure you have a wallet created. 
                    {(error as Error).message}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="p-6 border-2 border-primary rounded-lg bg-primary/5 space-y-4">
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg text-center">Your 12-Word Recovery Phrase</h3>
                      <p className="text-xs text-center text-destructive font-semibold mt-2">
                        DO NOT copy or screenshot - Write on paper only
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {recoveryPhrase.map((word, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                          data-testid={`word-${index + 1}`}
                        >
                          <span className="text-xs text-muted-foreground font-semibold w-6">
                            {index + 1}.
                          </span>
                          <span className="font-mono font-bold text-lg">
                            {word}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!isLoading && !error && (
                <>
                  <Alert className="border-amber-600 bg-amber-600/5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <span className="font-semibold">Write these words in order</span> on paper. 
                      Store the paper in a safe place like a fireproof safe or safety deposit box.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm">Storage Best Practices:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Keep in a fireproof, waterproof safe</li>
                      <li>Consider making 2 copies stored in different secure locations</li>
                      <li>Never store in cloud storage, email, or messaging apps</li>
                      <li>Don't tell anyone where you keep it</li>
                      <li>Consider a safety deposit box for long-term storage</li>
                    </ul>
                  </div>

                  {secondsViewed < 10 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Please take time to write down all 12 words carefully. 
                        You must view this screen for at least {10 - secondsViewed} more seconds.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleGoBack}
            disabled={revealed}
            data-testid="button-go-back"
          >
            Go Back
          </Button>
          {revealed && !isLoading && !error && recoveryPhrase.length === 12 && (
            <Button
              onClick={handleProceed}
              disabled={secondsViewed < 10}
              data-testid="button-proceed-to-verification"
              className="min-w-[200px]"
            >
              I've Written It Down - Proceed to Verification
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

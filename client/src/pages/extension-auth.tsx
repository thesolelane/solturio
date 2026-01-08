import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Shield } from "lucide-react";

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void
        ) => void;
      };
    };
  }
}

type AuthStatus = "loading" | "sending" | "success" | "error" | "no-extension";

export default function ExtensionAuth() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const extId = params.get("ext_id");

    if (!extId) {
      setStatus("error");
      setErrorMessage("No extension ID provided");
      return;
    }

    if (!window.chrome?.runtime?.sendMessage) {
      setStatus("no-extension");
      setErrorMessage("Chrome extension API not available. Please use Chrome browser.");
      return;
    }

    async function sendTokenToExtension() {
      setStatus("sending");

      try {
        const response = await fetch("/api/extension/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to generate extension token");
        }

        const { token } = await response.json();

        window.chrome!.runtime!.sendMessage(
          extId!,
          { type: "SOLTURIO_AUTH_TOKEN", token },
          (response) => {
            if (response?.success) {
              setStatus("success");
            } else {
              setStatus("error");
              setErrorMessage("Failed to send token to extension. Make sure the extension is installed.");
            }
          }
        );
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unknown error occurred");
      }
    }

    sendTokenToExtension();
  }, []);

  const handleClose = () => {
    window.close();
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md" data-testid="card-extension-auth">
        <CardHeader className="text-center gap-2">
          <div className="mx-auto mb-2">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <CardTitle>Solturio Extension</CardTitle>
          <CardDescription>
            Connecting your account to the browser extension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="status-loading">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Preparing authentication...</p>
            </div>
          )}

          {status === "sending" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="status-sending">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Sending credentials to extension...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="status-success">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <p className="font-medium text-lg">Connected Successfully!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Your Solturio extension is now linked to your account.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={handleClose} data-testid="button-close-tab">
                  Close This Tab
                </Button>
                <Button variant="outline" onClick={handleGoHome} data-testid="button-go-home">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="status-error">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <div className="text-center">
                <p className="font-medium text-lg">Connection Failed</p>
                <p className="text-muted-foreground text-sm mt-1">{errorMessage}</p>
              </div>
              <Button variant="outline" onClick={handleGoHome} data-testid="button-retry">
                Return to Dashboard
              </Button>
            </div>
          )}

          {status === "no-extension" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="status-no-extension">
              <AlertCircle className="w-12 h-12 text-amber-500" />
              <div className="text-center">
                <p className="font-medium text-lg">Extension Not Detected</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {errorMessage}
                </p>
              </div>
              <Button variant="outline" onClick={handleGoHome} data-testid="button-dashboard">
                Return to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, X, Wallet, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WalletTierSelection() {
  const [, setLocation] = useLocation();
  const [selectedTier, setSelectedTier] = useState<"standard" | "premium">("standard");
  const [customName, setCustomName] = useState("");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Mock user account number (in real app, this would come from backend)
  const accountNumber = "042";

  const checkNameAvailability = async (name: string) => {
    if (!name || name.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsCheckingAvailability(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock availability check (in real app, this would call backend)
    const reserved = ["solturio", "official", "support", "admin", "trustwallet"];
    const available = !reserved.includes(name.toLowerCase());

    setIsAvailable(available);
    setIsCheckingAvailability(false);
  };

  const handleCustomNameChange = (value: string) => {
    // Only allow alphanumeric characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setCustomName(sanitized);

    if (sanitized.length >= 3) {
      checkNameAvailability(sanitized);
    } else {
      setIsAvailable(null);
    }
  };

  const handleContinue = () => {
    // Proceed to Key Handover Ceremony
    setLocation("/register/ceremony/stage1");
  };

  const isCustomNameValid =
    selectedTier === "premium" &&
    customName.length >= 3 &&
    customName.length <= 32 &&
    isAvailable === true;

  const canContinue = selectedTier === "standard" || isCustomNameValid;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Choose Your Wallet Name</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your `xxx.solturio.sol` wallet will store certificates, smart contracts, and IPFS hashes.
          Choose between auto-assigned or custom naming.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-8">
        {/* Standard Tier */}
        <Card
          className={`cursor-pointer transition-all ${selectedTier === "standard" ? "ring-2 ring-primary" : "hover-elevate"}`}
          onClick={() => setSelectedTier("standard")}
        >
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl">Standard</CardTitle>
              <Badge variant="secondary">0.1 SOL</Badge>
            </div>
            <CardDescription className="text-base">
              Auto-assigned number-based wallet name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview */}
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Your wallet name:</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {accountNumber}.solturio.sol
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Clean, sequential naming</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Zero additional cost</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Instant setup</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Full functionality</span>
              </div>
            </div>

            {/* Best For */}
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold mb-2">Best for:</p>
              <p className="text-sm text-muted-foreground">
                Individual creators, artists, testing, budget-conscious users
              </p>
            </div>

            {selectedTier === "standard" && (
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <Check className="w-4 h-4" />
                <span>Selected</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Tier */}
        <Card
          className={`cursor-pointer transition-all ${selectedTier === "premium" ? "ring-2 ring-primary" : "hover-elevate"}`}
          onClick={() => setSelectedTier("premium")}
        >
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <Badge>0.15 SOL</Badge>
            </div>
            <CardDescription className="text-base">
              Custom branded wallet name of your choice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Custom Name Input */}
            <div className="space-y-2">
              <Label htmlFor="custom-name">Your Custom Name</Label>
              <div className="relative">
                <Input
                  id="custom-name"
                  placeholder="e.g., dragoncoin"
                  value={customName}
                  onChange={(e) => handleCustomNameChange(e.target.value)}
                  disabled={selectedTier !== "premium"}
                  className="pr-10 font-mono"
                  data-testid="input-custom-wallet-name"
                />
                {selectedTier === "premium" && customName.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingAvailability ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : isAvailable === true ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : isAvailable === false ? (
                      <X className="w-4 h-4 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Preview */}
              {customName && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Preview:</p>
                  <p className="text-lg font-mono font-bold text-primary">
                    {customName}.solturio.sol
                  </p>
                </div>
              )}

              {/* Validation Messages */}
              {selectedTier === "premium" && customName.length > 0 && customName.length < 3 && (
                <p className="text-sm text-muted-foreground">Minimum 3 characters required</p>
              )}
              {selectedTier === "premium" && customName.length > 32 && (
                <p className="text-sm text-destructive">Maximum 32 characters</p>
              )}
              {isAvailable === false && (
                <p className="text-sm text-destructive">This name is not available</p>
              )}
              {isAvailable === true && (
                <p className="text-sm text-green-600 dark:text-green-400">✓ Name is available!</p>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Memorable branded name</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Professional appearance</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Marketing advantage</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>3-32 alphanumeric chars</span>
              </div>
            </div>

            {/* Best For */}
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold mb-2">Best for:</p>
              <p className="text-sm text-muted-foreground">
                Token projects, businesses, brands seeking professional presence
              </p>
            </div>

            {selectedTier === "premium" && (
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <Check className="w-4 h-4" />
                <span>Selected</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Important Information */}
      <Card className="max-w-5xl mx-auto mb-8 bg-muted/30">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold">Important: Wallet Restrictions</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Your `xxx.solturio.sol` wallet ONLY accepts certificates and smart contracts
                </li>
                <li>SPL tokens sent to this wallet will be automatically rejected/burned</li>
                <li>This is NOT a trading wallet - use Phantom/Solflare for holding tokens</li>
                <li>Platform never handles wallet recovery - you control your private keys</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => setLocation("/register")}
          data-testid="button-back"
        >
          Back to Templates
        </Button>
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!canContinue}
          data-testid="button-continue-to-ceremony"
        >
          {selectedTier === "standard"
            ? "Continue with Standard (0.1 SOL)"
            : "Continue with Premium (0.15 SOL)"}
        </Button>
      </div>
    </div>
  );
}

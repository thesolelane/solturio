import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Palette, Check } from "lucide-react";

export default function RegisterSelect() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          What Are You Registering Today?
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the registration template that best fits your needs. This helps us provide stronger legal protection and verify your intellectual property rights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Token Launch Template */}
        <Card className="hover-elevate cursor-pointer transition-all" onClick={() => setLocation("/register/token-launch")}>
          <CardHeader className="space-y-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl mb-2">Token Launch</CardTitle>
              <CardDescription className="text-base">
                Complete protection package for launching a new token or cryptocurrency project
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="font-semibold text-sm">You'll register:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Token name, ticker, and artwork</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Launch platform and timeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Social media accounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Project documentation</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold mb-2 text-foreground">Best for:</p>
              <p className="text-sm text-muted-foreground">
                New token projects, meme coins, utility tokens, NFT launches requiring maximum legal protection and proof of "full intent"
              </p>
            </div>
            <Button className="w-full" size="lg" data-testid="button-select-token-launch">
              Register Token Launch
            </Button>
          </CardContent>
        </Card>

        {/* Artwork/Logo Template */}
        <Card className="hover-elevate cursor-pointer transition-all" onClick={() => setLocation("/register/artwork")}>
          <CardHeader className="space-y-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Palette className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl mb-2">Artwork / Logo</CardTitle>
              <CardDescription className="text-base">
                Protect individual artwork, logos, or designs with licensing options
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="font-semibold text-sm">You'll register:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Original artwork or logo files</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Creator information and rights</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Licensing and usage plans</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>NFT minting preferences</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold mb-2 text-foreground">Best for:</p>
              <p className="text-sm text-muted-foreground">
                Individual artists, designers, brands protecting logos, client work with licensing badges
              </p>
            </div>
            <Button className="w-full" size="lg" variant="outline" data-testid="button-select-artwork">
              Register Artwork
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <Card className="max-w-3xl mx-auto bg-muted/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 text-lg">Why We Ask These Questions</h3>
            <p className="text-sm text-muted-foreground">
              The smart questionnaires we use are designed by legal and blockchain experts to establish "full intent" and create the strongest possible intellectual property protection. The more complete your registration, the better we can defend your rights.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

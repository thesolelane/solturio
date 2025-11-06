import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Palette, ArrowRight, Shield, Scale, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function RegisterSelectTemplate() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Select Registration Type - Solturio";
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register intellectual property.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Register Your Intellectual Property</h1>
        <p className="text-muted-foreground">
          Choose the registration type that best fits your project
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Token Launch Template */}
        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/register/token-launch")}>
          <CardHeader>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">Token Launch</CardTitle>
                <CardDescription className="text-base">
                  Comprehensive registration for cryptocurrency tokens, meme coins, and blockchain projects
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">Perfect For:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Solana token launches on Pump.fun, Raydium, Jupiter</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Meme coins and community-driven projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>DeFi protocols and dApps</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm text-primary">What's Included:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Scale className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Token name, ticker, and artwork protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>24-hour social media verification system</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Legal questionnaire establishing full intent</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Smart contract hash registration</span>
                </li>
              </ul>
            </div>

            <Button 
              className="w-full mt-6" 
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/register/token-launch");
              }}
              data-testid="button-select-token-launch"
            >
              Start Token Registration
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Artwork Template */}
        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/register/artwork")}>
          <CardHeader>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Palette className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">Artwork & Design</CardTitle>
                <CardDescription className="text-base">
                  Streamlined registration for individual artists, designers, and creative professionals
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">Perfect For:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Logo designers and brand artists</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Freelance creators and illustrators</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Portfolio protection and licensing</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm text-primary">What's Included:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Artwork metadata and provenance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Licensing plans and usage documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Legal questionnaire for proof of creation</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Timestamped blockchain certificate</span>
                </li>
              </ul>
            </div>

            <Button 
              className="w-full mt-6" 
              size="lg" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/register/artwork");
              }}
              data-testid="button-select-artwork"
            >
              Start Artwork Registration
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Why Registration Templates Matter</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Our smart legal questionnaires establish <span className="font-bold">"full intent"</span> - proving you created 
                and own the intellectual property <span className="font-bold">before</span> anyone else. This creates an ironclad 
                legal defense against copycats and provides maximum protection in IP disputes.
              </p>
              <p className="text-sm text-muted-foreground">
                Each template is optimized for different use cases, asking 5-10 legally-focused questions that build 
                a comprehensive ownership record on the blockchain.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect } from "react";
import { Shield, Lock, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Landing() {
  useEffect(() => {
    document.title = "Centurio - Plant Your Standard on Chain";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="h-20 flex items-center px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Light Mode Logo - Dark colored logo for light backgrounds */}
              <img 
                src="/centurio-logo-light-mode.png"
                alt="Centurio Logo for Light Mode"
                className="w-14 h-14 object-contain dark:hidden"
              />
              {/* Dark Mode Logo - White colored logo for dark backgrounds */}
              <img 
                src="/centurio-logo-dark-mode.png"
                alt="Centurio Logo for Dark Mode"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Centurio
              </span>
            </div>
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign Up / Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Centurio Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src="/centurio-logo-dark.png"
              alt="Centurio"
              className="w-48 h-48 object-contain dark:hidden"
            />
            <img 
              src="/centurio-logo-white.png"
              alt="Centurio"
              className="w-48 h-48 object-contain hidden dark:block"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold mb-6">
            Plant Your Standard on Chain
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create immutable, timestamped proof of ownership for your logos and trademarks. 
            Mint NFTs on Solana to establish permanent IP protection.
          </p>
          <Button size="lg" className="gap-2" asChild data-testid="button-get-started">
            <a href="/api/login">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Why Centurio?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <Lock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Immutable Proof</h3>
              <p className="text-sm text-muted-foreground">
                Blockchain timestamps create tamper-proof evidence of ownership that stands up in IP disputes and trademark applications.
              </p>
            </Card>
            
            <Card className="p-6">
              <Clock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Priority Evidence</h3>
              <p className="text-sm text-muted-foreground">
                Prove you owned the logo first. DEXScreener and exchanges prioritize takedown requests backed by blockchain proof.
              </p>
            </Card>
            
            <Card className="p-6">
              <CheckCircle2 className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Auto-Documentation</h3>
              <p className="text-sm text-muted-foreground">
                We automatically extract technical specs (dimensions, colors, format) and let you add custom descriptions for complete records.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 border-2">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Starter</h3>
                <div className="text-3xl font-bold mb-4">$49</div>
                <p className="text-sm text-muted-foreground mb-6">Up to 5 logos</p>
                <Button className="w-full" variant="outline" asChild data-testid="button-pricing-starter">
                  <a href="/api/login">Get Started</a>
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 border-2 border-primary">
              <div className="text-center">
                <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>
                <h3 className="text-lg font-semibold mb-2">Professional</h3>
                <div className="text-3xl font-bold mb-4">$99</div>
                <p className="text-sm text-muted-foreground mb-6">Up to 20 logos</p>
                <Button className="w-full" asChild data-testid="button-pricing-professional">
                  <a href="/api/login">Get Started</a>
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 border-2">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                <div className="text-3xl font-bold mb-4">$299</div>
                <p className="text-sm text-muted-foreground mb-6">Unlimited logos</p>
                <Button className="w-full" variant="outline" asChild data-testid="button-pricing-enterprise">
                  <a href="/api/login">Get Started</a>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Centurio. Powered by Solana & Metaplex.</p>
        </div>
      </footer>
    </div>
  );
}

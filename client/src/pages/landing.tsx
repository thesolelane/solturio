import { useEffect } from "react";
import { Shield, Lock, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Using public folder logos directly

export default function Landing() {
  useEffect(() => {
    document.title = "Solturio - Plant Your Standard on Chain";
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
                src="/solturio-logo-dark.png"
                alt="Solturio Logo"
                className="w-14 h-14 object-contain dark:hidden"
              />
              {/* Dark Mode Logo - White colored logo for dark backgrounds */}
              <img 
                src="/solturio-logo-white.png"
                alt="Solturio Logo"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Solturio
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
          {/* Solturio Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src="/solturio-logo-dark.png"
              alt="Solturio"
              className="w-48 h-48 object-contain dark:hidden"
            />
            <img 
              src="/solturio-logo-white.png"
              alt="Solturio"
              className="w-48 h-48 object-contain hidden dark:block"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold mb-4">
            Plant Your Standard on Chain
          </h1>
          <div className="text-sm text-muted-foreground mb-6 font-medium">
            IP IS A JOURNEY - BLOCKCHAIN IS YOUR BEST FRIEND
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            <strong>Register First, Use Everywhere.</strong> Create your innovation timeline with immutable blockchain proof. 
            Protect PFPs, logos, tickers, and evolving digital assets BEFORE posting anywhere. 
            Gold check verified users get automatic takedown support.
          </p>
          <Button size="lg" className="gap-2" asChild data-testid="button-get-started">
            <a href="/api/login">
              Start Your IP Journey <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            The Solturio Protection Workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-1">Register First</h3>
              <p className="text-sm text-muted-foreground">
                Upload your PFP, logo, or ticker BEFORE using anywhere
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-1">Get Gold Check</h3>
              <p className="text-sm text-muted-foreground">
                Receive verified URLs with blockchain proof
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">Use Everywhere</h3>
              <p className="text-sm text-muted-foreground">
                Post on Twitter/X, launch tokens, build community
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">We Handle Takedowns</h3>
              <p className="text-sm text-muted-foreground">
                Copycats? We contact platforms directly for removal
              </p>
            </div>
          </div>
          
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="text-center">
              <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Platform Support Network</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We maintain direct contacts with IP teams at major platforms:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>✓ Twitter/X</div>
                <div>✓ Telegram</div>
                <div>✓ TikTok</div>
                <div>✓ Discord</div>
                <div>✓ Instagram</div>
                <div>✓ DexScreener</div>
                <div>✓ Raydium</div>
                <div>✓ Pump.fun</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* IP Journey Section - Inspired by WIPO */}
      <section className="py-12 px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-4">
              IP Management Is a Daily Practice, Not a One-Time Activity
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              As recognized by the World Intellectual Property Organization (WIPO), managing IP assets in the digital age 
              requires daily attention. Solturio makes this journey simple with blockchain-powered innovation timelines.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Evolving Digital Assets</h4>
              <p className="text-sm text-muted-foreground">
                Protect constantly changing designs, datasets, and creative works with immutable timestamps
              </p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Employee Mobility</h4>
              <p className="text-sm text-muted-foreground">
                Guard against IP theft when team members move between competitors
              </p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Partnership Protection</h4>
              <p className="text-sm text-muted-foreground">
                Establish ownership before collaborating with universities or labs
              </p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Investor Relations</h4>
              <p className="text-sm text-muted-foreground">
                Prove IP ownership when raising funds with cryptographic fingerprints
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Why Brands, Communities & Creators Choose Solturio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <Lock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Immutable Innovation Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Public blockchain creates tamper-proof evidence of when you first created your IP. 
                Independent from any central authority, accepted globally.
              </p>
            </Card>
            
            <Card className="p-6">
              <Clock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Active Takedown Support</h3>
              <p className="text-sm text-muted-foreground">
                We don't just provide proof - we actively contact platforms on your behalf. 
                Direct relationships with Twitter/X, DEXs, and social media IP teams.
              </p>
            </Card>
            
            <Card className="p-6">
              <CheckCircle2 className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">For Modern Digital Assets</h3>
              <p className="text-sm text-muted-foreground">
                Perfect for PFPs, evolving designs, community logos, token tickers, and any 
                digital IP that needs protection in Web2 and Web3.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Pay with Crypto - No Fiat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 border-2">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Solana</h3>
                <div className="text-3xl font-bold mb-2">0.5 SOL</div>
                <div className="text-sm text-muted-foreground mb-4">or 100,000 BONK</div>
                <p className="text-sm text-muted-foreground mb-6">Up to 5 logos</p>
                <Button className="w-full" variant="outline" asChild data-testid="button-pricing-starter">
                  <a href="/api/login">Pay with SOL</a>
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 border-2 border-primary">
              <div className="text-center">
                <div className="text-xs font-semibold text-primary mb-2">BEST VALUE - 50% OFF</div>
                <h3 className="text-lg font-semibold mb-2">$CATH Token</h3>
                <div className="text-3xl font-bold mb-2">500 CATH</div>
                <div className="text-sm text-green-600 dark:text-green-400 line-through mb-1">1,000 CATH</div>
                <p className="text-sm text-muted-foreground mb-6">Up to 20 logos</p>
                <Button className="w-full" asChild data-testid="button-pricing-professional">
                  <a href="/api/login">Pay with CATH</a>
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 border-2">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Arweave Storage</h3>
                <div className="text-2xl font-bold mb-2">1 AR</div>
                <div className="text-sm text-muted-foreground mb-4">+ 0.3 SOL network fee</div>
                <p className="text-sm text-muted-foreground mb-6">Permanent storage, unlimited logos</p>
                <Button className="w-full" variant="outline" asChild data-testid="button-pricing-enterprise">
                  <a href="/api/login">Pay with AR</a>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Solturio. Powered by Solana & Metaplex.</p>
        </div>
      </footer>
    </div>
  );
}

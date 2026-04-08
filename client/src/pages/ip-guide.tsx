import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink,
  Shield,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { Link } from "wouter";

export default function IPGuide() {
  useEffect(() => {
    document.title = "IP Protection Guide - Solturio";
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Intellectual Property Protection Guide</h1>
        <p className="text-muted-foreground text-lg">
          Understand your options for protecting your logo and brand identity
        </p>
      </div>

      <Card className="mb-8 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Why Multiple Layers of Protection?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>Blockchain NFTs</strong> provide immutable, timestamped proof of ownership -
            perfect for establishing creation dates and takedown requests on crypto platforms like
            DEXScreener.
          </p>
          <p>
            <strong>Legal trademark registration</strong> provides enforceable rights in court,
            broader protection across industries, and the ability to sue infringers for damages.
          </p>
          <p className="text-muted-foreground">
            For maximum protection, we recommend combining blockchain proof with legal registration.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="trademark" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trademark" data-testid="tab-trademark">
            Trademark Registration
          </TabsTrigger>
          <TabsTrigger value="copyright" data-testid="tab-copyright">
            Copyright Registration
          </TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison">
            Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trademark" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>US Trademark Registration (USPTO)</CardTitle>
              <CardDescription>
                Register your logo as a trademark to protect your brand identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Cost</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>$250-$350</strong> USPTO filing fee per class
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>$500-$2,000+</strong> attorney fees (optional but recommended)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Timeline</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>8-12 months</strong> for approval
                      </p>
                      <p className="text-sm text-muted-foreground">Initial review in 3-4 months</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  What You Get
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Exclusive rights to use the mark in your industry/class</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Legal presumption of ownership nationwide</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Ability to sue in federal court for infringement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Use of ® symbol (only after registration)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Customs protection against imports of infringing goods</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Basis for international trademark protection</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Filing Process</h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Search existing trademarks to avoid conflicts</li>
                  <li>
                    Choose your trademark class(es) - most logos use Class 25 (clothing) or Class 35
                    (business services)
                  </li>
                  <li>File TEAS Standard or TEAS Plus application</li>
                  <li>Respond to any USPTO office actions (3-4 months)</li>
                  <li>Publication for opposition (30 days)</li>
                  <li>Registration issued if no opposition</li>
                </ol>
              </div>

              <Button asChild variant="default" data-testid="button-uspto">
                <a
                  href="https://www.uspto.gov/trademarks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit USPTO Website
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copyright" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>US Copyright Registration</CardTitle>
              <CardDescription>Register your logo artwork for copyright protection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Cost</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>$45-$65</strong> online filing fee
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>$125</strong> paper filing (not recommended)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Timeline</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>3-5 months</strong> for registration
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Protection begins at creation, registration strengthens it
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  What You Get
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Protection for the artistic expression of your logo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Public record of your copyright claim</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Ability to sue in federal court</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Eligibility for statutory damages (up to $150,000 per work)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Attorney's fees in infringement cases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Customs protection against imports</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Important Notes</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Copyright protects artistic expression, not the brand name itself</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Simple logos may not qualify (must have sufficient creativity)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Protection lasts for life of creator + 70 years</span>
                  </li>
                </ul>
              </div>

              <Button asChild variant="default" data-testid="button-copyright">
                <a href="https://www.copyright.gov" target="_blank" rel="noopener noreferrer">
                  Visit Copyright Office
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">
                  Blockchain NFT
                </Badge>
                <CardTitle className="text-lg">Solturio</CardTitle>
                <CardDescription>Immutable proof of creation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Cost</p>
                  <p className="text-sm text-muted-foreground">Variable in SOL + $CATH</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Timeline</p>
                  <p className="text-sm text-muted-foreground">Instant</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Best For</p>
                  <p className="text-sm text-muted-foreground">
                    Proving creation date, crypto platform takedowns, establishing priority
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">
                  Legal Protection
                </Badge>
                <CardTitle className="text-lg">Trademark</CardTitle>
                <CardDescription>Brand identity protection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Cost</p>
                  <p className="text-sm text-muted-foreground">$250-$2,000+</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Timeline</p>
                  <p className="text-sm text-muted-foreground">8-12 months</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Best For</p>
                  <p className="text-sm text-muted-foreground">
                    Preventing brand confusion, exclusive use rights, legal enforcement
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">
                  Legal Protection
                </Badge>
                <CardTitle className="text-lg">Copyright</CardTitle>
                <CardDescription>Artistic work protection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Cost</p>
                  <p className="text-sm text-muted-foreground">$45-$65</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Timeline</p>
                  <p className="text-sm text-muted-foreground">3-5 months</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Best For</p>
                  <p className="text-sm text-muted-foreground">
                    Protecting artistic design, preventing copying, statutory damages
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Recommended Protection Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Step 1: Blockchain Proof (Solturio)</p>
                    <p className="text-sm text-muted-foreground">
                      Immediately establish timestamped proof of creation. Perfect for crypto-native
                      projects and quick takedown requests.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">
                      Step 2: Copyright Registration (if artistic)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      If your logo has creative/artistic elements, file for copyright protection.
                      Quick and affordable ($45-65, 3-5 months).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">
                      Step 3: Trademark Registration (for serious brands)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      If you're building a long-term brand, invest in trademark registration.
                      Provides strongest legal protection ($250-2000+, 8-12 months).
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-muted/50 border-0">
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold mb-2">Coming Soon: Solturio Filing Service</p>
                  <p className="text-sm text-muted-foreground">
                    We're partnering with IP attorneys to offer assisted trademark and copyright
                    filing services directly through Solturio. Get notified when this launches!
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card
        className="mt-8 border-primary/30 bg-primary/5"
        data-testid="card-international-creators"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            For International Creators
          </CardTitle>
          <CardDescription>
            Key requirements and options if your residence or principal place of business is outside
            the United States
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Copyright (Berne Convention)</p>
              <p className="text-sm text-muted-foreground">
                Works by nationals of 179+ Berne member countries receive automatic U.S. copyright
                protection. Voluntary registration with the U.S. Copyright Office unlocks statutory
                damages and attorney's fees in infringement suits.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Trademark (Attorney Required)</p>
              <p className="text-sm text-muted-foreground">
                Since August 3, 2019, all foreign-domiciled applicants must use a U.S.-licensed
                attorney. You may file via Section 44(d) (priority from a pending foreign
                application) or Section 44(e) (based on an existing foreign registration), or
                through the Madrid Protocol covering 100+ countries.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Patents (Paris Convention &amp; PCT)</p>
              <p className="text-sm text-muted-foreground">
                File in the U.S. within 12 months of your home-country patent application to claim
                Paris Convention priority. The PCT allows a single international application
                covering 150+ countries with up to 30 months before national phase entry.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button asChild variant="default" data-testid="button-foreign-ip-kb">
              <Link to="/knowledge-base?tab=foreign-ip">
                Learn More in the Knowledge Base
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Sources:{" "}
            <a
              href="https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              USPTO.gov
            </a>
            {" · "}
            <a
              href="https://www.copyright.gov/circs/circ38a.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Copyright.gov (Circular 38a)
            </a>
            {" · "}
            <a
              href="https://www.wipo.int/pct/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              WIPO.int
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

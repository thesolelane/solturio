import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Copyright, Verified, AlertCircle } from "lucide-react";

export default function KnowledgeBase() {
  useEffect(() => {
    document.title = "IP Knowledge Base - Solturio";
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">IP Protection Knowledge Base</h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to know about protecting your intellectual property
        </p>
      </div>

      <Card className="mb-8 border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Important Legal Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Solturio is NOT a law firm and does not provide legal advice.</strong> We
            provide technology tools to help you create blockchain-based proof of logo ownership and
            manage your digital assets.
          </p>
          <p>
            Recording your logo on the blockchain does NOT constitute legal trademark or copyright
            registration. It creates an immutable timestamped record that can support your claims,
            but does not replace formal legal registration with government authorities.
          </p>
          <p>
            For legal protection and the ability to enforce your rights in court, you must register
            your trademark with the USPTO (or equivalent in your country) and/or register your
            copyright with the U.S. Copyright Office.
          </p>
          <p className="font-semibold">
            We strongly recommend consulting with a qualified intellectual property attorney for
            specific legal advice about protecting your brand.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="symbols" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="symbols" data-testid="tab-symbols">
            IP Symbols
          </TabsTrigger>
          <TabsTrigger value="trademark" data-testid="tab-trademark">
            Trademarks
          </TabsTrigger>
          <TabsTrigger value="copyright" data-testid="tab-copyright">
            Copyrights
          </TabsTrigger>
          <TabsTrigger value="classes" data-testid="tab-classes">
            Trademark Classes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="symbols" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <div className="text-6xl font-bold mb-2">™</div>
                <CardTitle>Trademark Symbol</CardTitle>
                <CardDescription>Common Law Trademark</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">When to Use</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Unregistered trademarks</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Pending trademark applications</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Marks used in commerce but not federally registered</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Legal Protection</p>
                  <p className="text-sm text-muted-foreground">
                    Provides common law rights in the geographic area where you use the mark.
                    Limited protection compared to ®.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">No Registration Required</p>
                  <p className="text-sm text-muted-foreground">
                    Anyone can use ™ symbol. No legal filing needed.
                  </p>
                </div>
                <Badge variant="secondary" className="w-full justify-center">
                  FREE TO USE
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-primary/50">
              <CardHeader className="text-center">
                <div className="text-6xl font-bold mb-2 text-primary">®</div>
                <CardTitle>Registered Trademark</CardTitle>
                <CardDescription>Federally Registered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">When to Use</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>ONLY after USPTO registration is complete</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Cannot use while application is pending</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Must have received Certificate of Registration</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Legal Protection</p>
                  <p className="text-sm text-muted-foreground">
                    Nationwide exclusive rights. Presumption of ownership. Right to sue in federal
                    court. Strongest protection available.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">⚠️ Illegal Use Warning</p>
                  <p className="text-sm text-destructive">
                    Using ® without registration is illegal and can result in penalties.
                  </p>
                </div>
                <Badge className="w-full justify-center">REQUIRES USPTO REGISTRATION</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="text-6xl font-bold mb-2">©</div>
                <CardTitle>Copyright Symbol</CardTitle>
                <CardDescription>Creative Works</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">When to Use</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Original creative works (art, music, writing)</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Artistic logo designs</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>Photographs, illustrations, graphics</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Legal Protection</p>
                  <p className="text-sm text-muted-foreground">
                    Automatic protection upon creation. Registration strengthens rights and enables
                    statutory damages in lawsuits.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Format</p>
                  <p className="text-sm text-muted-foreground">
                    © [Year] [Owner Name]
                    <br />
                    Example: © 2025 Cooperanth LLC
                  </p>
                </div>
                <Badge variant="secondary" className="w-full justify-center">
                  NO REGISTRATION REQUIRED TO USE
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Decision Guide: Which Symbol Should I Use?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold mb-2">Use ™ if:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• You're using a brand name or logo in commerce</li>
                    <li>• You haven't registered with USPTO yet</li>
                    <li>• Your trademark application is pending</li>
                    <li>• You want to claim rights but aren't ready for formal registration</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg border-primary/50 bg-primary/5">
                  <p className="font-semibold mb-2">Use ® if:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>
                      • You have a USPTO-registered trademark (Certificate of Registration received)
                    </li>
                    <li>• Your registration is active and maintained</li>
                    <li>• You want maximum legal protection and deterrence</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="font-semibold mb-2">Use © if:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Your logo is artistic/creative (not just text or simple shapes)</li>
                    <li>• You want to protect the visual design itself</li>
                    <li>• You've created original artwork, photography, or illustrations</li>
                    <li>
                      • You can use this even without registration, but registration strengthens
                      your rights
                    </li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="font-semibold mb-2">💡 Pro Tip: You can use multiple symbols!</p>
                  <p className="text-sm text-muted-foreground">
                    For example: <span className="font-mono">MyBrand® © 2025 Cooperanth LLC</span>
                    <br />
                    This indicates both registered trademark status AND copyright protection for the
                    artistic design.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trademark" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What is a Trademark?</CardTitle>
              <CardDescription>
                Understanding trademark protection for your brand identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Definition</h3>
                <p className="text-sm text-muted-foreground">
                  A trademark is any word, phrase, symbol, design, or combination that identifies
                  and distinguishes the source of goods or services. Trademarks protect your brand
                  identity and prevent consumer confusion.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">What Can Be Trademarked?</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">✓ Can Be Trademarked:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Brand names (Nike, Apple)</li>
                      <li>• Logos and symbols</li>
                      <li>• Slogans ("Just Do It")</li>
                      <li>• Product shapes (Coca-Cola bottle)</li>
                      <li>• Colors (Tiffany Blue)</li>
                      <li>• Sounds (Intel chime)</li>
                      <li>• Combinations of the above</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">✗ Cannot Be Trademarked:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Generic terms ("Computer" for computers)</li>
                      <li>• Descriptive terms ("Fast Shipping")</li>
                      <li>• Government symbols (flags, seals)</li>
                      <li>• Scandalous or immoral matter</li>
                      <li>• Confusingly similar to existing marks</li>
                      <li>• Surnames alone (without acquired distinctiveness)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Trademark vs. Service Mark</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-primary/30">
                    <CardContent className="pt-6">
                      <p className="font-semibold mb-2">Trademark (™)</p>
                      <p className="text-sm text-muted-foreground">
                        Identifies the source of <strong>goods/products</strong>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Example: Logo on clothing, electronics, food products
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30">
                    <CardContent className="pt-6">
                      <p className="font-semibold mb-2">Service Mark (℠)</p>
                      <p className="text-sm text-muted-foreground">
                        Identifies the source of <strong>services</strong>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Example: Logo for consulting, banking, SaaS platforms
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Note: The ® symbol applies to both trademarks and service marks once federally
                  registered.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">
                  Trademark Rights: Common Law vs. Federal Registration
                </h3>
                <div className="space-y-3">
                  <Card>
                    <CardContent className="pt-6 space-y-2">
                      <p className="font-semibold">Common Law Rights (Using ™)</p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Rights limited to geographic area of use</li>
                        <li>• Must prove continuous use and ownership</li>
                        <li>• Harder to enforce against infringers</li>
                        <li>• No federal court access</li>
                        <li>• Lower damages in disputes</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/50">
                    <CardContent className="pt-6 space-y-2">
                      <p className="font-semibold text-primary">
                        Federal Registration Rights (Using ®)
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Nationwide exclusive rights</li>
                        <li>• Legal presumption of ownership</li>
                        <li>• Public notice of your claim</li>
                        <li>• Federal court jurisdiction</li>
                        <li>• Statutory damages up to $2,000,000</li>
                        <li>• Customs protection (stops imports)</li>
                        <li>• Basis for foreign registration</li>
                        <li>• Incontestable after 5 years</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copyright" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What is Copyright?</CardTitle>
              <CardDescription>
                Understanding copyright protection for creative works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Definition</h3>
                <p className="text-sm text-muted-foreground">
                  Copyright protects original works of authorship fixed in a tangible medium. It
                  gives creators exclusive rights to reproduce, distribute, display, and create
                  derivative works.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Copyright vs. Trademark</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Aspect</th>
                        <th className="text-left py-3 px-4">Copyright (©)</th>
                        <th className="text-left py-3 px-4">Trademark (™/®)</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Protects</td>
                        <td className="py-3 px-4">Creative expression and artistic works</td>
                        <td className="py-3 px-4">Brand identity and source identification</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Examples</td>
                        <td className="py-3 px-4">Books, art, music, photographs, software code</td>
                        <td className="py-3 px-4">Brand names, logos, slogans</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Duration</td>
                        <td className="py-3 px-4">Life of author + 70 years</td>
                        <td className="py-3 px-4">Forever (if renewed every 10 years)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Rights Begin</td>
                        <td className="py-3 px-4">Automatically upon creation</td>
                        <td className="py-3 px-4">Upon commercial use (™) or registration (®)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Registration Required?</td>
                        <td className="py-3 px-4">No, but recommended for enforcement</td>
                        <td className="py-3 px-4">No for ™, YES for ®</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Copyrighting Your Logo</h3>
                <div className="space-y-3">
                  <Card className="border-primary/30">
                    <CardContent className="pt-6">
                      <p className="font-semibold mb-2 text-primary">
                        ✓ Logos That Qualify for Copyright
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Artistic illustrations or drawings</li>
                        <li>• Complex graphic designs with creative elements</li>
                        <li>• Stylized typography with artistic expression</li>
                        <li>• Original character designs or mascots</li>
                        <li>• Logos combining multiple creative elements</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/30">
                    <CardContent className="pt-6">
                      <p className="font-semibold mb-2 text-destructive">
                        ✗ Logos That May NOT Qualify
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Simple geometric shapes (circles, squares)</li>
                        <li>• Plain text in standard fonts</li>
                        <li>• Common symbols or icons</li>
                        <li>• Minimalist designs lacking creativity</li>
                        <li>• Logos below "threshold of originality"</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Fair Use & Exceptions</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Copyright law includes "fair use" exceptions that allow limited use without
                  permission:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Commentary, criticism, or news reporting</li>
                  <li>• Educational purposes (classroom use)</li>
                  <li>• Parody or transformative works</li>
                  <li>• Limited scholarly or research use</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Note: Fair use is complex and fact-specific. When in doubt, seek permission or
                  legal advice.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Understanding Trademark Classes</CardTitle>
              <CardDescription>
                The Nice Classification system organizes trademarks into 45 classes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  When you register a trademark, you must specify which class(es) of goods or
                  services your mark covers. Each class requires a separate filing fee ($250-350 per
                  class). Choose strategically!
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Goods (Classes 1-34)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 25
                      </Badge>
                      <CardTitle className="text-base">Clothing & Apparel</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Most common for logo-branded merchandise: t-shirts, hats, shoes, jackets,
                      accessories.
                      <p className="font-semibold text-primary mt-2">
                        Popular for crypto/Web3 brands
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 9
                      </Badge>
                      <CardTitle className="text-base">Electronics & Software</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Software, mobile apps, downloadable files, NFTs (digital assets), computer
                      hardware.
                      <p className="font-semibold text-primary mt-2">
                        Essential for tech companies
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 16
                      </Badge>
                      <CardTitle className="text-base">Paper & Printed Materials</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Stickers, posters, business cards, stationery, printed publications.
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 21
                      </Badge>
                      <CardTitle className="text-base">Household Items</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Mugs, water bottles, drinkware, household containers.
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Services (Classes 35-45)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-primary/50">
                    <CardHeader className="pb-3">
                      <Badge className="w-fit">Class 42</Badge>
                      <CardTitle className="text-base">Technology Services</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      SaaS platforms, software development, hosting services, IT consulting,
                      blockchain services.
                      <p className="font-semibold text-primary mt-2">Perfect for Solturio!</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 35
                      </Badge>
                      <CardTitle className="text-base">Business Services</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Advertising, marketing, business management, online marketplaces.
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 36
                      </Badge>
                      <CardTitle className="text-base">Financial Services</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Cryptocurrency services, payment processing, financial transactions,
                      investment services.
                      <p className="font-semibold text-primary mt-2">Key for crypto projects</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit">
                        Class 41
                      </Badge>
                      <CardTitle className="text-base">Education & Entertainment</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Online education, gaming, entertainment services, content creation.
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="bg-muted/50 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">💡 Strategic Class Selection Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1">Start with your core business</p>
                    <p className="text-muted-foreground">
                      File in the class(es) that cover your primary products/services first.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Plan for expansion</p>
                    <p className="text-muted-foreground">
                      Consider future products. For crypto brands: Class 9 (NFTs) + Class 25 (merch)
                      + Class 42 (platform services) is common.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Budget wisely</p>
                    <p className="text-muted-foreground">
                      Each class costs $250-350. Filing in 3 classes = $750-1,050 in fees alone.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Actual use required</p>
                    <p className="text-muted-foreground">
                      You must have evidence of using the mark in each class you file for. Don't
                      file speculatively.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

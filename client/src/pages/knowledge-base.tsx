import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Copyright, Verified, AlertCircle, Globe, ExternalLink } from "lucide-react";

const VALID_TABS = ["symbols", "trademark", "copyright", "classes", "foreign-ip"] as const;
type TabValue = (typeof VALID_TABS)[number];

function getInitialTab(): TabValue {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && VALID_TABS.includes(tab as TabValue)) {
    return tab as TabValue;
  }
  return "symbols";
}

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<TabValue>(getInitialTab);

  useEffect(() => {
    document.title = "IP Knowledge Base - Solturio";
  }, []);

  function handleTabChange(value: string) {
    if (!VALID_TABS.includes(value as TabValue)) return;
    setActiveTab(value as TabValue);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url.toString());
  }

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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="foreign-ip" data-testid="tab-foreign-ip">
            Foreign IP
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

        <TabsContent value="foreign-ip" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Foreign IP Protection in the United States
              </CardTitle>
              <CardDescription>
                How international creators can protect their intellectual property under U.S. law
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you are a creator outside the United States, U.S. law still offers significant
                protection for your works, trademarks, and inventions. The sections below explain
                your rights and filing options under copyright, trademark, and patent law — all
                sourced from official U.S. government authorities.
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Critical Rule: U.S. Attorney Requirement (Since August 3, 2019)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold">
                ALL trademark applicants whose permanent legal residence or principal place of
                business is outside the United States MUST be represented by a U.S.-licensed
                attorney before the USPTO.
              </p>
              <p className="text-sm text-muted-foreground">
                This rule applies to every stage of USPTO proceedings — filing, responses to office
                actions, maintenance filings, and appeals. Foreign applicants cannot represent
                themselves.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  Source: USPTO.gov
                </Badge>
                <a
                  href="https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-attorney-requirement"
                >
                  Verify on USPTO.gov <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copyright className="w-5 h-5 text-primary" />
                Copyright for Foreign Nationals
              </CardTitle>
              <CardDescription>Automatic and voluntary protection under U.S. law</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="font-semibold mb-2">Automatic Protection — Berne Convention</h3>
                <p className="text-sm text-muted-foreground">
                  If you are a national or resident of one of the 179+ member countries of the Berne
                  Convention, your works receive automatic copyright protection in the United States
                  the moment they are created and fixed in a tangible form. No registration,
                  application, or deposit is required for this baseline protection to apply.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">
                  Why Voluntarily Register with the U.S. Copyright Office?
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  While Berne protection is automatic, voluntary registration with the U.S.
                  Copyright Office unlocks critical enforcement tools:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      The right to sue for <strong>statutory damages</strong> (up to $150,000 per
                      work for willful infringement) — without needing to prove actual damages
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      The right to recover <strong>attorney's fees</strong> from the infringer
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      A <strong>public record</strong> of your copyright claim
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      The ability to record your copyright with U.S. Customs to stop infringing
                      imports
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Badge variant="outline" className="text-xs">
                  Source: Copyright.gov (Circular 38a)
                </Badge>
                <a
                  href="https://www.copyright.gov/circs/circ38a.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-circular-38a"
                >
                  Circular 38a — International Copyright Relations{" "}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Trademark for Foreign Applicants
              </CardTitle>
              <CardDescription>
                Filing paths and requirements for non-U.S. residents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="font-semibold mb-2">U.S. Attorney Requirement</h3>
                <p className="text-sm text-muted-foreground">
                  As of August 3, 2019, all foreign-domiciled applicants must hire a U.S.-licensed
                  attorney to file and prosecute a U.S. trademark application with the USPTO. This
                  includes applicants from every country, regardless of their home country's IP
                  system.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Section 44 Filing Paths</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-primary/30">
                    <CardContent className="pt-5 space-y-2">
                      <p className="font-semibold text-sm">Section 44(d) — Priority Filing</p>
                      <p className="text-sm text-muted-foreground">
                        Based on a <strong>pending foreign trademark application</strong>. Allows
                        you to claim priority from your home-country filing date, provided you file
                        in the U.S. within <strong>6 months</strong> of that foreign application.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30">
                    <CardContent className="pt-5 space-y-2">
                      <p className="font-semibold text-sm">Section 44(e) — Existing Registration</p>
                      <p className="text-sm text-muted-foreground">
                        Based on an <strong>existing foreign trademark registration</strong>. You
                        can file a U.S. application without proving current use in U.S. commerce,
                        relying on your home-country registration as the basis.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Madrid Protocol Option</h3>
                <p className="text-sm text-muted-foreground">
                  Foreign applicants can also seek U.S. trademark protection through the Madrid
                  Protocol — a WIPO-administered system that lets you file a single international
                  application covering 100+ countries. The application is filed through your home
                  country's IP office and WIPO routes it to each designated country, including the
                  U.S. USPTO then examines the U.S. portion under U.S. law.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Badge variant="outline" className="text-xs">
                  Source: USPTO.gov
                </Badge>
                <a
                  href="https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-foreign-trademark"
                >
                  USPTO — Foreign Trademark Applicants <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://www.wipo.int/madrid/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-madrid-protocol"
                >
                  WIPO Madrid Protocol <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Verified className="w-5 h-5 text-primary" />
                Patents for Foreign Nationals
              </CardTitle>
              <CardDescription>
                International priority and cooperative filing options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="font-semibold mb-2">Paris Convention Priority</h3>
                <p className="text-sm text-muted-foreground">
                  If you file a patent application in your home country, you have a
                  <strong> 12-month window</strong> to file a corresponding U.S. patent application
                  and claim priority from your home-country filing date. This means the U.S.
                  application is treated as if it were filed on the same date as your original
                  foreign application — preserving your priority against intervening publications or
                  competing applications.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">PCT — Patent Cooperation Treaty</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The PCT is administered by WIPO and allows inventors to file a single
                  international patent application covering 150+ countries simultaneously. Key
                  features:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>One application, one filing fee, one set of formal requirements</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      Delays the need to enter national phase (pay individual country fees) for up
                      to <strong>30 months</strong> from the priority date
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      Includes an international search and preliminary examination to assess
                      patentability before committing to national filings
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>U.S. national phase entry is handled by the USPTO</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Badge variant="outline" className="text-xs">
                  Source: USPTO.gov
                </Badge>
                <a
                  href="https://www.uspto.gov/patents/basics/international-protection/pct-information"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-pct-info"
                >
                  USPTO — PCT Information <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://www.wipo.int/pct/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-wipo-pct"
                >
                  WIPO PCT <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

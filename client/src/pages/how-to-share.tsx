import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Twitter, Send, Globe, Check, Image, Shield, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verified-image";

export default function HowToShare() {
  useEffect(() => {
    document.title = "How to Share Your Verified Images - Solturio";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="h-20 flex items-center px-6 lg:px-8">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover-elevate" data-testid="link-home">
              <img 
                src="/solturio-logo-light-mode.png"
                alt="Solturio Logo"
                className="w-14 h-14 object-contain dark:hidden"
              />
              <img 
                src="/solturio-logo-dark-mode.png"
                alt="Solturio Logo"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Solturio
              </span>
            </Link>
            <Button variant="outline" size="sm" asChild className="gap-2" data-testid="button-back-collections">
              <Link href="/collections">
                <ArrowLeft className="w-4 h-4" />
                Back to Collections
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
            How to Share Your Verified Images
            <VerificationBadge size="md" />
          </h1>
          <p className="text-muted-foreground">
            Use your IPFS-hosted verified images on social media to prove you own the original
          </p>
        </div>

        {/* Why Use Verified Images */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Why Use Verified Images?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              When you mint your collection on Solturio, we create <strong>verified versions</strong> of your images with a gold check badge overlay. These images are stored permanently on IPFS (InterPlanetary File System) and cannot be deleted or modified.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Proves Ownership</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  The gold badge shows your image is registered on the blockchain
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Deters Copycats</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Scammers can't fake the badge - it's embedded in the IPFS file
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Permanent Storage</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  IPFS links never expire - your proof lasts forever
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step by Step Guide */}
        <h2 className="text-xl font-semibold mb-4">Step-by-Step Guide</h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                Copy Your IPFS URL
              </CardTitle>
              <CardDescription>
                Go to My Collections and find your minted collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Navigate to <Link href="/collections" className="text-primary underline" data-testid="link-my-collections">My Collections</Link></li>
                <li>Click on a <strong>minted</strong> collection to expand it</li>
                <li>Scroll down to "Share Verified Images" section</li>
                <li>Click the <Copy className="w-4 h-4 inline" /> copy button next to the image you want to share</li>
              </ol>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Your URL will look like:</p>
                <code className="text-xs font-mono text-muted-foreground break-all">
                  https://ipfs.io/ipfs/QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Twitter/X */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                <Twitter className="w-5 h-5" />
                Share on Twitter/X
              </CardTitle>
              <CardDescription>
                Use as profile picture or share in posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">As Profile Picture:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Open your IPFS URL in a browser</li>
                    <li>Right-click the image and "Save Image As..."</li>
                    <li>Go to Twitter Settings &gt; Profile &gt; Edit Profile</li>
                    <li>Upload the saved image as your profile picture</li>
                    <li><strong>Pin a tweet</strong> with your IPFS URL so others can verify it's the same image</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium mb-2">In a Tweet:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Open your IPFS URL and save the image</li>
                    <li>Create a new tweet and attach the image</li>
                    <li>Include the IPFS link in your tweet text for verification</li>
                    <li>Add hashtags like #Solturio #IPProtected #SolanaIP</li>
                  </ol>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Pro Tip:</strong> Put your IPFS link in your Twitter bio! This lets anyone verify your official logo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                <Send className="w-5 h-5" />
                Share on Telegram
              </CardTitle>
              <CardDescription>
                Perfect for token creator groups and announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">For Your Group/Channel:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Set the verified image as your group/channel photo</li>
                    <li>Pin a message with your IPFS URL for verification</li>
                    <li>Add the IPFS link to your group description</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium mb-2">In Messages:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Send the IPFS URL directly - Telegram will show a preview</li>
                    <li>Or save and send the image with the IPFS link as caption</li>
                  </ol>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Bot Tip:</strong> Our Telegram bot can verify images in real-time! Just forward an image to @SolturioBot and it will check if it's registered.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DEX Platforms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</span>
                <Image className="w-5 h-5" />
                Use on DEX Platforms
              </CardTitle>
              <CardDescription>
                For token creators listing on pump.fun, Raydium, Jupiter, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  When listing your token, use your verified IPFS URL as the token logo. This proves you're the original creator and deters copycats.
                </p>
                <div>
                  <h4 className="font-medium mb-2">Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>During token creation, find the "Logo URL" or "Image" field</li>
                    <li>Paste your IPFS URL (not the gateway URL)</li>
                    <li>Most DEXs will automatically fetch and display the image</li>
                    <li>The gold badge will be visible to all users</li>
                  </ol>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Important:</strong> Register your logo on Solturio <strong>before</strong> launching your token. This establishes your timestamp of ownership.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Website */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">5</span>
                <Globe className="w-5 h-5" />
                Use on Your Website
              </CardTitle>
              <CardDescription>
                Embed the verified image directly from IPFS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You can embed your verified image directly from IPFS on your website. This loads the image from decentralized storage.
                </p>
                <div>
                  <h4 className="font-medium mb-2">HTML Code:</h4>
                  <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <code>
                      {`<img src="https://ipfs.io/ipfs/YOUR_HASH_HERE" alt="Verified Logo" />`}
                    </code>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Alternative Gateways:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><code>https://gateway.pinata.cloud/ipfs/...</code></li>
                    <li><code>https://cloudflare-ipfs.com/ipfs/...</code></li>
                    <li><code>https://ipfs.io/ipfs/...</code> (recommended)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Can someone else copy my verified image?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  They can download it, but the IPFS hash proves YOU registered it first. The blockchain timestamp is permanent and verifiable. If someone uses your image, you have proof of original ownership.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">What if the IPFS link doesn't load?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  IPFS is decentralized, so occasionally a gateway may be slow. Try a different gateway URL (Pinata, Cloudflare, etc.). Your file is pinned permanently and will always be available.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Do I have to use the verified image (with badge)?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You can use either! The verified image (with gold badge) is recommended for social media and DEXs because it visually shows your IP is protected. The original image IPFS hash is also stored in your NFT certificate for verification.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gap-2" data-testid="button-cta-back-collections">
            <Link href="/collections">
              <ArrowLeft className="w-4 h-4" />
              Back to My Collections
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

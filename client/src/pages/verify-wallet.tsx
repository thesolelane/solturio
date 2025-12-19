import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Shield, ShieldCheck, ShieldX, Twitter, Send, Instagram, Globe, Calendar, ExternalLink, ArrowLeft, Loader2, Image, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface VerificationResult {
  verified: boolean;
  walletAddress: string;
  walletDomain?: string;
  message?: string;
  creator?: {
    firstName: string | null;
    lastName: string | null;
    twitterHandle: string | null;
    telegramHandle: string | null;
    instagramHandle: string | null;
    websiteUrl: string | null;
    bio: string | null;
    memberSince: string | null;
  };
  collections?: Array<{
    id: string;
    name: string;
    ticker: string | null;
    registrationType: string;
    status: string;
    mintedAt: string | null;
  }>;
  totalCollections?: number;
}

export default function VerifyWalletPage() {
  const [walletInput, setWalletInput] = useState("");
  const [searchedWallet, setSearchedWallet] = useState("");

  const { data: result, isLoading, error, refetch } = useQuery<VerificationResult>({
    queryKey: ["/api/public/verify-wallet", searchedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/public/verify-wallet/${encodeURIComponent(searchedWallet)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Verification failed");
      }
      return res.json();
    },
    enabled: searchedWallet.length >= 32,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (walletInput.length >= 32) {
      setSearchedWallet(walletInput);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-back-home">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Wallet Verification</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verify if a Solana wallet address is linked to a registered creator on Solturio.
              This helps confirm authentic ownership and protect against impersonation.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Verify a Wallet
            </CardTitle>
            <CardDescription>
              Enter a Solana wallet address to check if it belongs to a verified Solturio creator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Enter Solana wallet address (e.g., 7xKXt...)"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                className="flex-1 font-mono text-sm"
                data-testid="input-wallet-address"
              />
              <Button type="submit" disabled={walletInput.length < 32 || isLoading} data-testid="button-verify">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!searchedWallet && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enter a Wallet Address</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Paste a Solana wallet address to check if it belongs to a verified creator with protected IP on Solturio.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Verifying wallet...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <ShieldX className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verification Error</h3>
              <p className="text-muted-foreground">{(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {result && !result.verified && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6 text-center">
              <ShieldX className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Not Verified</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                {result.message || "This wallet address is not linked to any registered creator on Solturio."}
              </p>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm break-all">
                {result.walletAddress}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This doesn't necessarily mean the wallet is fraudulent - it may simply not be registered on our platform.
              </p>
            </CardContent>
          </Card>
        )}

        {result && result.verified && (
          <div className="space-y-6">
            <Card className="border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <ShieldCheck className="w-12 h-12 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">Verified Creator</h3>
                    <p className="text-muted-foreground mb-4">
                      This wallet is registered on Solturio and linked to a verified creator account.
                    </p>
                    <div className="bg-background/50 rounded-lg p-4 font-mono text-sm break-all">
                      {result.walletAddress}
                    </div>
                    {result.walletDomain && (
                      <Badge className="mt-3 bg-green-600">
                        {result.walletDomain}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.creator && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Creator Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">
                        {result.creator.firstName} {result.creator.lastName}
                      </h4>
                      {result.creator.memberSince && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Member since {formatDate(result.creator.memberSince)}
                        </p>
                      )}
                    </div>
                  </div>

                  {result.creator.bio && (
                    <p className="text-sm text-muted-foreground">{result.creator.bio}</p>
                  )}

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {result.creator.twitterHandle && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`https://twitter.com/${result.creator!.twitterHandle}`, "_blank")}
                        data-testid="link-twitter"
                      >
                        <Twitter className="w-4 h-4" />
                        @{result.creator.twitterHandle}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    {result.creator.telegramHandle && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`https://t.me/${result.creator!.telegramHandle}`, "_blank")}
                        data-testid="link-telegram"
                      >
                        <Send className="w-4 h-4" />
                        @{result.creator.telegramHandle}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    {result.creator.instagramHandle && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`https://instagram.com/${result.creator!.instagramHandle}`, "_blank")}
                        data-testid="link-instagram"
                      >
                        <Instagram className="w-4 h-4" />
                        @{result.creator.instagramHandle}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    {result.creator.websiteUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(result.creator!.websiteUrl!, "_blank")}
                        data-testid="link-website"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.collections && result.collections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Protected Collections ({result.totalCollections})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                        data-testid={`collection-${collection.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                            <Image className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{collection.name}</span>
                              {collection.ticker && (
                                <Badge variant="secondary">${collection.ticker}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {collection.registrationType === "token" ? "Token Project" : "Artwork"}
                              {collection.mintedAt && ` • Verified ${formatDate(collection.mintedAt)}`}
                            </p>
                          </div>
                        </div>
                        {collection.status === "minted" && (
                          <Badge className="bg-green-600">Verified</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

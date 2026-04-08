import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Twitter,
  Send,
  Instagram,
  Globe,
  Users,
  ExternalLink,
  Copy,
  Loader2,
  Image,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface PublicCollection {
  id: string;
  name: string;
  ticker: string;
  registrationType: string;
  status: string;
  logoCount: number;
  mintedAt: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    twitterHandle: string | null;
    telegramHandle: string | null;
    instagramHandle: string | null;
    telegramGroupLink: string | null;
    websiteUrl: string | null;
    bio: string | null;
  };
}

export default function DiscoverPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "ticker" | "social">("all");

  const {
    data: results,
    isLoading,
    refetch,
  } = useQuery<PublicCollection[]>({
    queryKey: ["/api/public/search", searchQuery, searchType],
    queryFn: async () => {
      const params = new URLSearchParams({ query: searchQuery, type: searchType });
      const res = await fetch(`/api/public/search?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      refetch();
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-back-home">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Discover Protected Creations</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Search for verified artists, token creators, and their protected collections. Find
              collaborators or verify authentic ownership.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by ticker symbol, Twitter handle, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Button type="submit" disabled={searchQuery.length < 2} data-testid="button-search">
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={searchType === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSearchType("all")}
                data-testid="filter-all"
              >
                All
              </Badge>
              <Badge
                variant={searchType === "ticker" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSearchType("ticker")}
                data-testid="filter-ticker"
              >
                By Ticker Symbol
              </Badge>
              <Badge
                variant={searchType === "social" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSearchType("social")}
                data-testid="filter-social"
              >
                By Social Handle
              </Badge>
            </div>
          </form>
        </Card>

        {searchQuery.length < 2 && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Search for Protected Creations</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter at least 2 characters to search for artists, token tickers, or social media
              handles.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {results && results.length === 0 && searchQuery.length >= 2 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              No collections or artists match your search. Try a different query.
            </p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Found {results.length} result{results.length !== 1 ? "s" : ""}
            </p>

            {results.map((collection) => (
              <Card
                key={collection.id}
                className="p-6"
                data-testid={`card-collection-${collection.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Image className="w-10 h-10 text-primary" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-semibold">{collection.name}</h3>
                          {collection.ticker && (
                            <Badge
                              variant="secondary"
                              data-testid={`badge-ticker-${collection.id}`}
                            >
                              ${collection.ticker}
                            </Badge>
                          )}
                          {collection.status === "minted" && (
                            <Badge
                              className="bg-green-600"
                              data-testid={`badge-verified-${collection.id}`}
                            >
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {collection.registrationType === "token"
                            ? "Token Project"
                            : "Artwork Collection"}
                          {collection.logoCount > 0 &&
                            ` • ${collection.logoCount} image${collection.logoCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>

                    {collection.user.bio && (
                      <p className="text-sm text-muted-foreground">{collection.user.bio}</p>
                    )}

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Creator Contact</h4>
                      <div className="flex flex-wrap gap-2">
                        {collection.user.twitterHandle && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              window.open(
                                `https://twitter.com/${collection.user.twitterHandle}`,
                                "_blank"
                              )
                            }
                            data-testid={`link-twitter-${collection.id}`}
                          >
                            <Twitter className="w-4 h-4" />@{collection.user.twitterHandle}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}

                        {collection.user.telegramHandle && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              window.open(
                                `https://t.me/${collection.user.telegramHandle}`,
                                "_blank"
                              )
                            }
                            data-testid={`link-telegram-${collection.id}`}
                          >
                            <Send className="w-4 h-4" />@{collection.user.telegramHandle}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}

                        {collection.user.instagramHandle && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              window.open(
                                `https://instagram.com/${collection.user.instagramHandle}`,
                                "_blank"
                              )
                            }
                            data-testid={`link-instagram-${collection.id}`}
                          >
                            <Instagram className="w-4 h-4" />@{collection.user.instagramHandle}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}

                        {collection.user.telegramGroupLink && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              window.open(collection.user.telegramGroupLink!, "_blank")
                            }
                            data-testid={`link-tg-group-${collection.id}`}
                          >
                            <Users className="w-4 h-4" />
                            Telegram Group
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}

                        {collection.user.websiteUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(collection.user.websiteUrl!, "_blank")}
                            data-testid={`link-website-${collection.id}`}
                          >
                            <Globe className="w-4 h-4" />
                            Website
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}

                        {!collection.user.twitterHandle &&
                          !collection.user.telegramHandle &&
                          !collection.user.instagramHandle &&
                          !collection.user.websiteUrl && (
                            <span className="text-sm text-muted-foreground">
                              No contact information available
                            </span>
                          )}
                      </div>
                    </div>

                    {collection.ticker && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ticker:</span>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          ${collection.ticker}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(`$${collection.ticker}`, "Ticker")}
                          data-testid={`button-copy-ticker-${collection.id}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

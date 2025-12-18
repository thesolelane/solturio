import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Loader2, ExternalLink, Copy, Check, Sparkles, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import type { Collection, Logo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Collections() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "My Collections - Solturio";
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: collections = [], isLoading } = useQuery<(Collection & { logos?: Logo[]; ipfsMetadataHash?: string })[]>({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
  });

  // Mint collection mutation
  const mintMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await apiRequest("POST", `/api/collections/${collectionId}/mint`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Collection Minted!",
        description: `${data.filesCount} files covered by 1 NFT certificate`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Address copied successfully",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="h-20 flex items-center px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover-elevate">
              {/* Light Mode Logo - Dark colored logo for light backgrounds */}
              <img 
                src="/solturio-logo-light-mode.png"
                alt="Solturio Logo for Light Mode"
                className="w-14 h-14 object-contain dark:hidden"
              />
              {/* Dark Mode Logo - White colored logo for dark backgrounds */}
              <img 
                src="/solturio-logo-dark-mode.png"
                alt="Solturio Logo for Dark Mode"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Solturio
              </span>
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">My Collections</h1>
          <p className="text-muted-foreground">
            View and manage your minted logo NFT collections
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No collections yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start by uploading your first logos
            </p>
            <Button asChild data-testid="button-upload-first">
              <Link href="/upload">Upload Logos</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {collections.map((collection) => (
              <Card key={collection.id} className="p-6" data-testid={`collection-${collection.id}`}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold mb-1">
                      {collection.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {collection.companyName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {collection.status === 'draft' && (
                      <Button
                        onClick={() => mintMutation.mutate(collection.id)}
                        disabled={mintMutation.isPending}
                        className="gap-2"
                        data-testid={`button-mint-${collection.id}`}
                      >
                        {mintMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Mint Collection
                      </Button>
                    )}
                    <div
                      className="inline-flex px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: collection.status === 'minted' ? 'hsl(var(--primary) / 0.1)' : 
                                       collection.status === 'pending' ? 'hsl(var(--muted))' : 
                                       'hsl(var(--accent))',
                        color: collection.status === 'minted' ? 'hsl(var(--primary))' : 
                              'hsl(var(--foreground))'
                      }}
                      data-testid={`status-${collection.id}`}
                    >
                      {collection.status === 'minted' && <FileCheck className="w-3 h-3 mr-1" />}
                      {collection.status}
                    </div>
                  </div>
                </div>

                {collection.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {collection.description}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {collection.symbol && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Symbol</Label>
                      <p className="text-sm font-medium">{collection.symbol}</p>
                    </div>
                  )}
                  {collection.copyrightYear && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Copyright Year</Label>
                      <p className="text-sm font-medium">{collection.copyrightYear}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p className="text-sm font-medium">
                      {collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {collection.mintedAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Minted</Label>
                      <p className="text-sm font-medium">
                        {new Date(collection.mintedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {collection.status === 'minted' && collection.collectionAddress && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        NFT Certificate Address
                      </Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded-md overflow-x-auto">
                          {collection.collectionAddress}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copyToClipboard(collection.collectionAddress!, collection.id)}
                          data-testid={`button-copy-${collection.id}`}
                        >
                          {copiedId === collection.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {collection.ipfsMetadataHash && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          IPFS Metadata (all file hashes)
                        </Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded-md overflow-x-auto">
                            {collection.ipfsMetadataHash}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(collection.ipfsMetadataHash!, `ipfs-${collection.id}`)}
                            data-testid={`button-copy-ipfs-${collection.id}`}
                          >
                            {copiedId === `ipfs-${collection.id}` ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {collection.explorerUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          asChild
                        >
                          <a href={collection.explorerUrl} target="_blank" rel="noopener noreferrer">
                            View on Solana
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                      {collection.ipfsMetadataHash && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          asChild
                        >
                          <a href={`https://ipfs.io/ipfs/${collection.ipfsMetadataHash}`} target="_blank" rel="noopener noreferrer">
                            View on IPFS
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {collection.logos && collection.logos.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-xs text-muted-foreground mb-3 block">
                      Logos in Collection ({collection.logos.length})
                    </Label>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {collection.logos.map((logo) => (
                        <div
                          key={logo.id}
                          className="aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center"
                          title={logo.fileName}
                        >
                          {logo.thumbnailUrl ? (
                            <img
                              src={logo.thumbnailUrl}
                              alt={logo.fileName}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground text-center p-1 truncate">
                              {logo.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

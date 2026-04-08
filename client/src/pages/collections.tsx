import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Share2,
  HelpCircle,
  Eye,
  EyeOff,
  Pencil,
  FileSignature,
  Link2,
  Music,
  Image,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { Collection, Logo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VerifiedImage, VerificationBadge } from "@/components/verified-image";

export default function Collections() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"collections" | "share-links">("collections");

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

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

  const { data: collections = [], isLoading } = useQuery<
    (Collection & { logos?: Logo[]; ipfsMetadataHash?: string })[]
  >({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
  });

  const { data: musicTracks = [] } = useQuery<any[]>({
    queryKey: ["/api/music/tracks"],
    enabled: isAuthenticated && activeTab === "share-links",
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

  // Toggle collection visibility mutation
  const visibilityMutation = useMutation({
    mutationFn: async ({ collectionId, isPublic }: { collectionId: string; isPublic: boolean }) => {
      const response = await apiRequest("PATCH", `/api/collections/${collectionId}/visibility`, {
        isPublic,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isPublic ? "Collection Public" : "Collection Private",
        description: data.isPublic
          ? "This collection can now be found in public search"
          : "This collection is now hidden from public search",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit collection mutation
  const editMutation = useMutation({
    mutationFn: async ({
      collectionId,
      name,
      description,
    }: {
      collectionId: string;
      name: string;
      description: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/collections/${collectionId}`, {
        name,
        description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Collection Updated",
        description: "Your collection details have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setEditingCollection(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (collection: Collection) => {
    setEditingCollection(collection);
    setEditName(collection.name);
    setEditDescription(collection.description || "");
  };

  const handleSaveEdit = () => {
    if (editingCollection && editName.trim()) {
      editMutation.mutate({
        collectionId: editingCollection.id,
        name: editName.trim(),
        description: editDescription.trim(),
      });
    }
  };

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
          <p className="text-muted-foreground">View and manage your minted logo NFT collections</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="collections" data-testid="tab-collections">
              <Image className="w-4 h-4 mr-1" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="share-links" data-testid="tab-share-links">
              <Link2 className="w-4 h-4 mr-1" />
              Share Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="mt-6">
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
                {collections.map((collection) => {
                  const isExpanded = expandedCollections.has(collection.id);
                  return (
                    <Card
                      key={collection.id}
                      className="overflow-hidden"
                      data-testid={`collection-${collection.id}`}
                    >
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleCollection(collection.id)}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <CollapsibleTrigger
                              className="flex items-start gap-3 text-left hover-elevate rounded-md p-1 -m-1"
                              data-testid={`toggle-${collection.id}`}
                            >
                              <div className="mt-1">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <h2 className="text-2xl font-semibold mb-1">{collection.name}</h2>
                                <p className="text-muted-foreground">{collection.companyName}</p>
                              </div>
                            </CollapsibleTrigger>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {collection.status === "draft" && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    mintMutation.mutate(collection.id);
                                  }}
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
                                  backgroundColor:
                                    collection.status === "minted"
                                      ? "hsl(var(--primary) / 0.1)"
                                      : collection.status === "pending"
                                        ? "hsl(var(--muted))"
                                        : "hsl(var(--accent))",
                                  color:
                                    collection.status === "minted"
                                      ? "hsl(var(--primary))"
                                      : "hsl(var(--foreground))",
                                }}
                                data-testid={`status-${collection.id}`}
                              >
                                {collection.status === "minted" && (
                                  <FileCheck className="w-3 h-3 mr-1" />
                                )}
                                {collection.status}
                              </div>
                            </div>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="px-6 pb-6">
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
                                  <Label className="text-xs text-muted-foreground">
                                    Copyright Year
                                  </Label>
                                  <p className="text-sm font-medium">{collection.copyrightYear}</p>
                                </div>
                              )}
                              <div>
                                <Label className="text-xs text-muted-foreground">Created</Label>
                                <p className="text-sm font-medium">
                                  {collection.createdAt
                                    ? new Date(collection.createdAt).toLocaleDateString()
                                    : "N/A"}
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

                            {collection.status === "minted" && collection.collectionAddress && (
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
                                      onClick={() =>
                                        copyToClipboard(
                                          collection.collectionAddress!,
                                          collection.id
                                        )
                                      }
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
                                        onClick={() =>
                                          copyToClipboard(
                                            collection.ipfsMetadataHash!,
                                            `ipfs-${collection.id}`
                                          )
                                        }
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

                                <div className="flex flex-wrap gap-2">
                                  {collection.explorerUrl && (
                                    <Button variant="outline" size="sm" className="gap-2" asChild>
                                      <a
                                        href={collection.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View on Solana
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  )}
                                  {collection.ipfsMetadataHash && (
                                    <Button variant="outline" size="sm" className="gap-2" asChild>
                                      <a
                                        href={`https://ipfs.io/ipfs/${collection.ipfsMetadataHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View on IPFS
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>

                                <div className="border-t pt-4 mt-4 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {collection.isPublic !== false ? (
                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <div>
                                        <Label className="text-sm font-medium">
                                          Discoverable in Public Search
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                          {collection.isPublic !== false
                                            ? "Others can find this collection by searching your handle or ticker"
                                            : "This collection is hidden from public search"}
                                        </p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={collection.isPublic !== false}
                                      onCheckedChange={(checked) => {
                                        visibilityMutation.mutate({
                                          collectionId: collection.id,
                                          isPublic: checked,
                                        });
                                      }}
                                      disabled={visibilityMutation.isPending}
                                      data-testid={`switch-visibility-${collection.id}`}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Pencil className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <Label className="text-sm font-medium">
                                          Edit Collection Details
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                          Change collection name or description
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditDialog(collection)}
                                      data-testid={`button-edit-${collection.id}`}
                                    >
                                      <Pencil className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {collection.logos && collection.logos.length > 0 && (
                              <div className="border-t pt-4 mt-4">
                                <Label className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                                  Files in Collection ({collection.logos.length})
                                  {collection.status === "minted" && (
                                    <span className="flex items-center gap-1 text-primary">
                                      <VerificationBadge size="sm" />
                                      Verified
                                    </span>
                                  )}
                                </Label>
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                  {collection.logos.map((logo) => (
                                    <div
                                      key={logo.id}
                                      className="aspect-square bg-muted rounded-md overflow-hidden relative group"
                                      title={logo.fileName}
                                    >
                                      {logo.thumbnailUrl ? (
                                        <>
                                          <img
                                            src={logo.thumbnailUrl}
                                            alt={logo.fileName}
                                            className="w-full h-full object-contain"
                                          />
                                          {collection.status === "minted" && (
                                            <VerificationBadge
                                              size="sm"
                                              className="absolute bottom-1 left-1 drop-shadow-lg"
                                            />
                                          )}
                                        </>
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <div className="text-xs text-muted-foreground text-center p-1 truncate">
                                            {logo.fileName?.split(".").pop()?.toUpperCase() ||
                                              "FILE"}
                                          </div>
                                          {collection.status === "minted" && (
                                            <VerificationBadge
                                              size="sm"
                                              className="absolute bottom-1 left-1 drop-shadow-lg"
                                            />
                                          )}
                                        </div>
                                      )}
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Link href={`/create-license/${logo.id}`}>
                                              <Button
                                                size="icon"
                                                variant="secondary"
                                                className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                data-testid={`button-license-${logo.id}`}
                                              >
                                                <FileSignature className="w-3 h-3" />
                                              </Button>
                                            </Link>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Create License Contract</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Verified Image URLs for Sharing - Only show for minted collections */}
                            {collection.status === "minted" &&
                              collection.logos &&
                              collection.logos.some((l) => l.arweaveUrl || l.verifiedIpfsHash) && (
                                <div className="border-t pt-4 mt-4">
                                  <div className="flex items-center justify-between gap-2 mb-3">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Share2 className="w-4 h-4" />
                                      Share Verified Images
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="w-3 h-3 cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>
                                              Use these permanent URLs when posting on Twitter,
                                              Telegram, or DEX platforms. The gold badge shows your
                                              ownership is verified.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className="gap-1"
                                      data-testid="button-how-to-share"
                                    >
                                      <Link href="/how-to-share">
                                        <HelpCircle className="w-3 h-3" />
                                        How to Share
                                      </Link>
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {collection.logos
                                      .filter((l) => l.arweaveUrl || l.verifiedIpfsHash)
                                      .map((logo) => {
                                        const shareUrl =
                                          logo.arweaveUrl ||
                                          `https://ipfs.io/ipfs/${logo.verifiedIpfsHash}`;
                                        const isArweave = !!logo.arweaveUrl;
                                        const displayUrl = isArweave
                                          ? `arweave.net/${logo.arweaveUrl?.split("/").pop()?.slice(0, 12)}...`
                                          : `ipfs.io/ipfs/${logo.verifiedIpfsHash?.slice(0, 12)}...`;

                                        return (
                                          <div
                                            key={`verified-${logo.id}`}
                                            className="flex items-center gap-2 bg-muted/50 rounded-md p-2"
                                            data-testid={`verified-url-${logo.id}`}
                                          >
                                            <div className="w-8 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                                              {logo.thumbnailUrl ? (
                                                <img
                                                  src={logo.thumbnailUrl}
                                                  alt=""
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                                  {logo.fileName
                                                    ?.split(".")
                                                    .pop()
                                                    ?.toUpperCase()
                                                    ?.slice(0, 3) || "F"}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium truncate">
                                                {logo.fileName}
                                              </p>
                                              <code className="text-xs text-muted-foreground font-mono truncate block">
                                                {displayUrl}
                                              </code>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      size="icon"
                                                      variant="ghost"
                                                      onClick={() =>
                                                        copyToClipboard(
                                                          shareUrl,
                                                          `verified-${logo.id}`
                                                        )
                                                      }
                                                      data-testid={`button-copy-verified-${logo.id}`}
                                                    >
                                                      {copiedId === `verified-${logo.id}` ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                      ) : (
                                                        <Copy className="w-4 h-4" />
                                                      )}
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    Copy {isArweave ? "Arweave" : "IPFS"} URL
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" asChild>
                                                      <a
                                                        href={shareUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        data-testid={`button-view-verified-${logo.id}`}
                                                      >
                                                        <ExternalLink className="w-4 h-4" />
                                                      </a>
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    View Verified Image
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    These images include the gold verification badge. Use them as
                                    your profile picture or logo on social media to prove ownership.
                                  </p>
                                </div>
                              )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="share-links" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    All Shareable Links
                  </CardTitle>
                  <CardDescription>
                    Copy these URLs to share your verified assets on social media, DEX platforms,
                    and websites
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logos Section */}
                  {collections.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Image className="w-5 h-5 text-primary" />
                        Logos
                        <Badge variant="secondary" className="ml-2">
                          {collections.reduce((acc, c) => acc + (c.logos?.length || 0), 0)}
                        </Badge>
                      </h3>
                      <div className="space-y-3">
                        {collections.map((collection) =>
                          collection.logos?.map((logo) => {
                            const ipfsUrl = logo.ipfsHash
                              ? `https://ipfs.io/ipfs/${logo.ipfsHash}`
                              : null;
                            const verifyUrl = `${window.location.origin}/verify/${logo.id}`;
                            const verifiedImageUrl = logo.verifiedIpfsHash
                              ? `https://ipfs.io/ipfs/${logo.verifiedIpfsHash}`
                              : null;

                            return (
                              <div key={logo.id} className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center gap-3">
                                  {logo.thumbnailUrl && (
                                    <img
                                      src={logo.thumbnailUrl}
                                      alt={logo.fileName}
                                      className="w-10 h-10 object-contain rounded"
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium">{logo.fileName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {collection.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-2">
                                  {ipfsUrl && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="default" className="text-xs shrink-0">
                                        IPFS
                                      </Badge>
                                      <Input
                                        value={ipfsUrl}
                                        readOnly
                                        className="font-mono text-xs flex-1"
                                      />
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => copyToClipboard(ipfsUrl, `ipfs-${logo.id}`)}
                                        data-testid={`button-copy-ipfs-${logo.id}`}
                                      >
                                        {copiedId === `ipfs-${logo.id}` ? (
                                          <Check className="w-4 h-4" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  )}

                                  {verifiedImageUrl && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs shrink-0">
                                        Verified
                                      </Badge>
                                      <Input
                                        value={verifiedImageUrl}
                                        readOnly
                                        className="font-mono text-xs flex-1"
                                      />
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() =>
                                          copyToClipboard(verifiedImageUrl, `verified-${logo.id}`)
                                        }
                                        data-testid={`button-copy-verified-${logo.id}`}
                                      >
                                        {copiedId === `verified-${logo.id}` ? (
                                          <Check className="w-4 h-4" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      Verify
                                    </Badge>
                                    <Input
                                      value={verifyUrl}
                                      readOnly
                                      className="font-mono text-xs flex-1"
                                    />
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() =>
                                        copyToClipboard(verifyUrl, `verify-${logo.id}`)
                                      }
                                      data-testid={`button-copy-verify-${logo.id}`}
                                    >
                                      {copiedId === `verify-${logo.id}` ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Music Section */}
                  {musicTracks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Music className="w-5 h-5 text-primary" />
                        Music Tracks
                        <Badge variant="secondary" className="ml-2">
                          {musicTracks.length}
                        </Badge>
                      </h3>
                      <div className="space-y-3">
                        {musicTracks.map((track: any) => {
                          const trackUrl = `${window.location.origin}/music/track/${track.id}`;
                          const ipfsUrl = track.previewIpfsHash
                            ? `https://ipfs.io/ipfs/${track.previewIpfsHash}`
                            : null;

                          return (
                            <div key={track.id} className="p-4 border rounded-lg space-y-3">
                              <div className="flex items-center gap-3">
                                {track.coverArtThumbnail && (
                                  <img
                                    src={track.coverArtThumbnail}
                                    alt={track.title}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{track.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {track.artistName}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="text-xs shrink-0">
                                    Track
                                  </Badge>
                                  <Input
                                    value={trackUrl}
                                    readOnly
                                    className="font-mono text-xs flex-1"
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => copyToClipboard(trackUrl, `track-${track.id}`)}
                                    data-testid={`button-copy-track-${track.id}`}
                                  >
                                    {copiedId === `track-${track.id}` ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>

                                {ipfsUrl && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      Preview
                                    </Badge>
                                    <Input
                                      value={ipfsUrl}
                                      readOnly
                                      className="font-mono text-xs flex-1"
                                    />
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() =>
                                        copyToClipboard(ipfsUrl, `preview-${track.id}`)
                                      }
                                      data-testid={`button-copy-preview-${track.id}`}
                                    >
                                      {copiedId === `preview-${track.id}` ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {collections.length === 0 && musicTracks.length === 0 && (
                    <div className="text-center py-8">
                      <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No shareable assets yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload logos or music to get shareable links
                      </p>
                      <div className="flex justify-center gap-3">
                        <Button asChild variant="outline">
                          <Link href="/upload">Upload Logos</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/music">Upload Music</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Sharing Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>IPFS URLs</strong> - Permanent, decentralized links that work anywhere
                  </p>
                  <p>
                    <strong>Verified URLs</strong> - Include the gold check badge overlay for
                    authenticity
                  </p>
                  <p>
                    <strong>Verify URLs</strong> - Link to your public verification page on Solturio
                  </p>
                  <Link
                    href="/how-to-share"
                    className="text-primary underline hover:no-underline"
                    data-testid="link-learn-sharing"
                  >
                    Learn more about sharing
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Collection Dialog */}
      <Dialog
        open={!!editingCollection}
        onOpenChange={(open) => !open && setEditingCollection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Collection Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter collection name"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter collection description"
                rows={3}
                data-testid="input-edit-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCollection(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || editMutation.isPending}
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

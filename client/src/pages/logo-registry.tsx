import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Logo } from "@shared/schema";
import { Link } from "wouter";
import {
  Shield,
  Loader2,
  Search,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  SortAsc,
  SortDesc,
  Sparkles,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Hash,
  Calendar,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SortField = "date" | "name" | "size" | "type";
type SortDir = "asc" | "desc";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getRegistrationTypeBadge(type: string | null | undefined) {
  if (type === "token_launch") {
    return (
      <Badge variant="default" data-testid="badge-type-token">
        Token Launch
      </Badge>
    );
  }
  if (type === "artwork") {
    return (
      <Badge variant="secondary" data-testid="badge-type-artwork">
        Artwork
      </Badge>
    );
  }
  return (
    <Badge variant="outline" data-testid="badge-type-logo">
      Logo
    </Badge>
  );
}

function getMintStatus(logo: Logo) {
  if (logo.nftAddress) {
    return { label: "Minted", variant: "default" as const, icon: CheckCircle };
  }
  return { label: "Pending", variant: "secondary" as const, icon: Clock };
}

function getVerificationBadge(logo: Logo) {
  if (logo.registrationType !== "token_launch") return null;
  if (logo.tickerVerified) {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="w-3 h-3" />
        Verified
      </Badge>
    );
  }
  if (logo.tickerVerificationDeadline) {
    const expired = new Date() > new Date(logo.tickerVerificationDeadline);
    if (expired) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    );
  }
  return null;
}

function LogoDetailDialog({
  logo,
  open,
  onClose,
}: {
  logo: Logo | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!logo) return null;

  const mintStatus = getMintStatus(logo);
  const MintIcon = mintStatus.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 flex-wrap"
            data-testid="dialog-logo-title"
          >
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">{logo.fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-40 h-40 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
              {logo.thumbnailUrl ? (
                <img
                  src={`/api/thumbnails/${logo.id}`}
                  alt={logo.fileName}
                  className="w-full h-full object-contain rounded-md"
                  data-testid="img-logo-detail"
                />
              ) : logo.imageUrl ? (
                <img
                  src={logo.imageUrl}
                  alt={logo.fileName}
                  className="w-full h-full object-contain rounded-md"
                  data-testid="img-logo-detail"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                {getRegistrationTypeBadge(logo.registrationType)}
                <Badge variant={mintStatus.variant} className="gap-1">
                  <MintIcon className="w-3 h-3" />
                  {mintStatus.label}
                </Badge>
                {getVerificationBadge(logo)}
              </div>

              {logo.description && (
                <p className="text-sm text-muted-foreground" data-testid="text-logo-description">
                  {logo.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Dimensions</span>
                  <p className="font-medium">
                    {logo.width} x {logo.height}px
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Format</span>
                  <p className="font-medium">{logo.format?.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">File Size</span>
                  <p className="font-medium">{formatFileSize(logo.fileSize)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Registered</span>
                  <p className="font-medium">{formatDate(logo.ownershipClaimedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {logo.registrationType === "token_launch" && (logo.tokenName || logo.tokenTicker) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Token Details
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {logo.tokenName && (
                  <div>
                    <span className="text-muted-foreground text-xs">Token Name</span>
                    <p className="font-medium" data-testid="text-token-name">
                      {logo.tokenName}
                    </p>
                  </div>
                )}
                {logo.tokenTicker && (
                  <div>
                    <span className="text-muted-foreground text-xs">Ticker</span>
                    <p className="font-medium" data-testid="text-token-ticker">
                      ${logo.tokenTicker}
                    </p>
                  </div>
                )}
                {logo.launchPlatform && (
                  <div>
                    <span className="text-muted-foreground text-xs">Platform</span>
                    <p className="font-medium capitalize">{logo.launchPlatform}</p>
                  </div>
                )}
                {logo.tokenContractAddress && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Contract Address</span>
                    <div className="flex items-center gap-2">
                      <code
                        className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1"
                        data-testid="text-contract-address"
                      >
                        {logo.tokenContractAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(logo.tokenContractAddress!, "ca")}
                        data-testid="button-copy-ca"
                      >
                        {copiedField === "ca" ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Cryptographic Proof
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">SHA-256 File Hash</span>
                <div className="flex items-center gap-2">
                  <code
                    className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1"
                    data-testid="text-file-hash"
                  >
                    {logo.fileHash}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(logo.fileHash, "hash")}
                    data-testid="button-copy-hash"
                  >
                    {copiedField === "hash" ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              {logo.ipfsHash && (
                <div>
                  <span className="text-muted-foreground text-xs">IPFS CID</span>
                  <div className="flex items-center gap-2">
                    <code
                      className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1"
                      data-testid="text-ipfs-hash"
                    >
                      {logo.ipfsHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`https://ipfs.io/ipfs/${logo.ipfsHash}`, "_blank")}
                      data-testid="button-view-ipfs"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {logo.nftAddress && (
                <div>
                  <span className="text-muted-foreground text-xs">NFT Certificate</span>
                  <div className="flex items-center gap-2">
                    <code
                      className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1"
                      data-testid="text-nft-address"
                    >
                      {logo.nftAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        window.open(`https://solscan.io/token/${logo.nftAddress}`, "_blank")
                      }
                      data-testid="button-view-nft"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {logo.transactionHash && (
                <div>
                  <span className="text-muted-foreground text-xs">Transaction Hash</span>
                  <div className="flex items-center gap-2">
                    <code
                      className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1"
                      data-testid="text-tx-hash"
                    >
                      {logo.transactionHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        window.open(`https://solscan.io/tx/${logo.transactionHash}`, "_blank")
                      }
                      data-testid="button-view-tx"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(logo.copyrightStatus || logo.trademarkStatus) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Legal Status
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {logo.copyrightStatus && logo.copyrightStatus !== "none" && (
                  <div>
                    <span className="text-muted-foreground text-xs">Copyright</span>
                    <p className="font-medium capitalize">
                      {logo.copyrightStatus.replace("_", " ")}
                    </p>
                    {logo.copyrightApplicationNumber && (
                      <p className="text-xs text-muted-foreground">
                        #{logo.copyrightApplicationNumber}
                      </p>
                    )}
                  </div>
                )}
                {logo.trademarkStatus && logo.trademarkStatus !== "none" && (
                  <div>
                    <span className="text-muted-foreground text-xs">Trademark</span>
                    <p className="font-medium capitalize">
                      {logo.trademarkStatus.replace("_", " ")}
                    </p>
                    {logo.trademarkApplicationNumber && (
                      <p className="text-xs text-muted-foreground">
                        #{logo.trademarkApplicationNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {logo.colorPalette && logo.colorPalette.length > 0 && (
            <div className="border-t pt-4">
              <span className="text-muted-foreground text-xs block mb-2">Color Palette</span>
              <div className="flex gap-1.5 flex-wrap">
                {logo.colorPalette.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-md border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {logo.tokenContractAddress ? (
              <Button variant="outline" size="sm" asChild data-testid="button-detail-bind-contract">
                <Link href={`/bind-contract/${logo.id}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  Manage Contract
                </Link>
              </Button>
            ) : logo.registrationType === "token_launch" ? (
              <Button variant="outline" size="sm" asChild data-testid="button-detail-bind-contract">
                <Link href={`/bind-contract/${logo.id}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  Bind Contract
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild data-testid="button-detail-collections">
              <Link href="/collections">
                <Layers className="w-3 h-3 mr-1" />
                View in Collection
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LogoRegistry() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLogo, setSelectedLogo] = useState<Logo | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Logo Registry - Solturio";
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

  const { data: logos = [], isLoading } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
    enabled: isAuthenticated,
  });

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredLogos = logos
    .filter((logo) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = logo.fileName?.toLowerCase().includes(q);
        const matchesDesc = logo.description?.toLowerCase().includes(q);
        const matchesTicker = logo.tokenTicker?.toLowerCase().includes(q);
        const matchesTokenName = logo.tokenName?.toLowerCase().includes(q);
        const matchesHash = logo.fileHash?.toLowerCase().includes(q);
        const matchesCA = logo.tokenContractAddress?.toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesDesc &&
          !matchesTicker &&
          !matchesTokenName &&
          !matchesHash &&
          !matchesCA
        ) {
          return false;
        }
      }
      if (typeFilter !== "all") {
        if (typeFilter === "token_launch" && logo.registrationType !== "token_launch") return false;
        if (typeFilter === "artwork" && logo.registrationType !== "artwork") return false;
        if (typeFilter === "logo") {
          const isPlainLogo =
            !logo.registrationType ||
            logo.registrationType === "logo" ||
            logo.registrationType === "";
          if (!isPlainLogo) return false;
        }
      }
      if (statusFilter !== "all") {
        if (statusFilter === "minted" && !logo.nftAddress) return false;
        if (statusFilter === "pending" && logo.nftAddress) return false;
        if (statusFilter === "verified" && !logo.tickerVerified) return false;
        if (statusFilter === "ca_bound" && !logo.tokenContractAddress) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.ownershipClaimedAt).getTime() - new Date(b.ownershipClaimedAt).getTime();
          break;
        case "name":
          cmp = (a.fileName || "").localeCompare(b.fileName || "");
          break;
        case "size":
          cmp = a.fileSize - b.fileSize;
          break;
        case "type":
          cmp = (a.registrationType || "").localeCompare(b.registrationType || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalCount = logos.length;
  const mintedCount = logos.filter((l) => l.nftAddress).length;
  const tokenCount = logos.filter((l) => l.registrationType === "token_launch").length;
  const artworkCount = logos.filter((l) => l.registrationType === "artwork").length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const renderSortButton = (field: SortField, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 -ml-2 font-medium text-xs"
      onClick={() => toggleSort(field)}
      data-testid={`button-sort-${field}`}
    >
      {label}
      {sortField === field ? (
        sortDir === "asc" ? (
          <SortAsc className="w-3 h-3" />
        ) : (
          <SortDesc className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="heading-logo-registry">
            Logo Registry
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete record of all your registered intellectual property
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Registered</p>
            <p className="text-2xl font-bold" data-testid="stat-total">
              {totalCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Minted NFTs</p>
            <p className="text-2xl font-bold" data-testid="stat-minted">
              {mintedCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Token Launches</p>
            <p className="text-2xl font-bold" data-testid="stat-tokens">
              {tokenCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Artworks</p>
            <p className="text-2xl font-bold" data-testid="stat-artworks">
              {artworkCount}
            </p>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ticker, hash, or contract address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-registry"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="token_launch">Token Launch</SelectItem>
                    <SelectItem value="artwork">Artwork</SelectItem>
                    <SelectItem value="logo">Logo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="minted">Minted</SelectItem>
                    <SelectItem value="pending">Pending Mint</SelectItem>
                    <SelectItem value="verified">Ticker Verified</SelectItem>
                    <SelectItem value="ca_bound">CA Bound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLogos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              {logos.length === 0 ? (
                <>
                  <h3 className="font-semibold mb-2">No Registrations Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Start protecting your intellectual property by registering your first logo or
                    artwork.
                  </p>
                  <Button asChild data-testid="button-register-first">
                    <Link href="/register">Register IP</Link>
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="font-semibold mb-2">No Results Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{renderSortButton("name", "Name")}</TableHead>
                      <TableHead>{renderSortButton("type", "Type")}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>{renderSortButton("size", "Size")}</TableHead>
                      <TableHead>{renderSortButton("date", "Registered")}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogos.map((logo) => {
                      const mintStatus = getMintStatus(logo);
                      const MintIcon = mintStatus.icon;
                      return (
                        <TableRow
                          key={logo.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedLogo(logo)}
                          data-testid={`row-logo-${logo.id}`}
                        >
                          <TableCell>
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                              {logo.thumbnailUrl ? (
                                <img
                                  src={`/api/thumbnails/${logo.id}`}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : logo.imageUrl ? (
                                <img
                                  src={logo.imageUrl}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p
                                className="font-medium text-sm truncate max-w-[200px]"
                                title={logo.fileName}
                              >
                                {logo.fileName}
                              </p>
                              {logo.tokenTicker && (
                                <p className="text-xs text-muted-foreground">${logo.tokenTicker}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRegistrationTypeBadge(logo.registrationType)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={mintStatus.variant} className="gap-1">
                                <MintIcon className="w-3 h-3" />
                                {mintStatus.label}
                              </Badge>
                              {getVerificationBadge(logo)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <code className="text-xs font-mono text-muted-foreground">
                                {logo.fileHash?.slice(0, 10)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyHash(logo.fileHash, logo.id);
                                }}
                                data-testid={`button-copy-hash-${logo.id}`}
                              >
                                {copiedHash === logo.id ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatFileSize(logo.fileSize)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(logo.ownershipClaimedAt)}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y">
                {filteredLogos.map((logo) => {
                  const mintStatus = getMintStatus(logo);
                  const MintIcon = mintStatus.icon;
                  return (
                    <div
                      key={logo.id}
                      className="p-4 hover-elevate cursor-pointer"
                      onClick={() => setSelectedLogo(logo)}
                      data-testid={`card-logo-${logo.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                          {logo.thumbnailUrl ? (
                            <img
                              src={`/api/thumbnails/${logo.id}`}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : logo.imageUrl ? (
                            <img
                              src={logo.imageUrl}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{logo.fileName}</p>
                          {logo.tokenTicker && (
                            <p className="text-xs text-muted-foreground">${logo.tokenTicker}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {getRegistrationTypeBadge(logo.registrationType)}
                            <Badge variant={mintStatus.variant} className="gap-1">
                              <MintIcon className="w-3 h-3" />
                              {mintStatus.label}
                            </Badge>
                            {getVerificationBadge(logo)}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <code className="text-xs font-mono text-muted-foreground">
                              {logo.fileHash?.slice(0, 12)}...
                            </code>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(logo.ownershipClaimedAt)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t text-xs text-muted-foreground text-center">
                Showing {filteredLogos.length} of {totalCount} registered items
              </div>
            </>
          )}
        </Card>
      </div>

      <LogoDetailDialog
        logo={selectedLogo}
        open={!!selectedLogo}
        onClose={() => setSelectedLogo(null)}
      />
    </div>
  );
}

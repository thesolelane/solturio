import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Globe,
  Calendar,
  DollarSign,
  Scale,
  Sparkles,
  Upload,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  Link2,
  Info,
} from "lucide-react";
import {
  LICENSE_TYPES,
  PLATFORM_BITS,
  LICENSE_TEMPLATES,
  createPlatformBitmap,
  getPermittedPlatforms,
} from "@shared/schema";
import type { Logo } from "@shared/schema";

const WIZARD_STEPS = [
  { id: 1, name: "Select Asset", icon: FileText },
  { id: 2, name: "License Type", icon: Shield },
  { id: 3, name: "Platforms", icon: Globe },
  { id: 4, name: "Rights", icon: Scale },
  { id: 5, name: "Duration", icon: Calendar },
  { id: 6, name: "Financial", icon: DollarSign },
  { id: 7, name: "Legal", icon: Scale },
  { id: 8, name: "Review", icon: Check },
];

const PLATFORM_INFO = [
  { key: "WEBSITE", label: "Website", description: "Company websites and landing pages" },
  { key: "YOUTUBE", label: "YouTube", description: "YouTube videos and channel branding" },
  { key: "DISCORD", label: "Discord", description: "Discord servers, bots, and communities" },
  { key: "TIKTOK", label: "TikTok", description: "TikTok videos and profile" },
  { key: "TELEGRAM", label: "Telegram", description: "Telegram groups, channels, and bots" },
  { key: "X_TWITTER", label: "X (Twitter)", description: "Twitter/X posts and profile" },
  { key: "INSTAGRAM", label: "Instagram", description: "Instagram posts, stories, and profile" },
  {
    key: "PRINT_PHYSICAL",
    label: "Print/Physical",
    description: "Printed materials, signage, packaging",
  },
  { key: "MERCHANDISE", label: "Merchandise", description: "T-shirts, mugs, stickers, etc." },
  {
    key: "GAMING_METAVERSE",
    label: "Gaming/Metaverse",
    description: "Games, virtual worlds, metaverse",
  },
  { key: "NFT_MARKETPLACES", label: "NFT Marketplaces", description: "OpenSea, Magic Eden, etc." },
  { key: "ADVERTISING", label: "Advertising", description: "Paid ads, sponsored content" },
];

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  SOCIAL_MEDIA_POST: "Perfect for influencer campaigns - X, Instagram, TikTok usage for 1 year",
  BRAND_AMBASSADOR:
    "Full platform access with modification rights, perpetual, requires attribution",
  WEBSITE_ONLY: "Simple website-only usage, perpetual, no modifications",
  MERCHANDISE: "Exclusive rights for physical products and merch for 2 years",
  FULL_BUYOUT: "Complete ownership transfer with all rights",
  NFT_WEB3: "Gaming and NFT marketplace usage with attribution",
};

export default function CreateLicense() {
  const [, navigate] = useLocation();
  const params = useParams<{ logoId?: string }>();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLogoId, setSelectedLogoId] = useState<string>(params.logoId || "");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [licenseeEmailError, setLicenseeEmailError] = useState("");

  const [formData, setFormData] = useState({
    licenseType: "non_exclusive" as
      | "exclusive"
      | "non_exclusive"
      | "work_for_hire"
      | "full_transfer",
    licenseeWallet: "",
    licenseeName: "",
    licenseeEmail: "",
    platformBitmap: 0,
    otherPlatforms: "",
    canTransfer: false,
    canSublicense: false,
    canModify: false,
    requiresAttribution: true,
    geographicScope: "worldwide" as "worldwide" | "specific",
    geographicDetails: "",
    usagePurpose: "both" as "personal" | "commercial" | "both",
    isPerpetual: false,
    durationDays: 365,
    isExclusivityTimeLimited: false,
    exclusivityDays: 0,
    hasRevenueShare: false,
    royaltyPercentage: "",
    upfrontPaymentAmount: "",
    upfrontPaymentCurrency: "SOL",
    autoRenew: false,
    renewalNoticeDays: 30,
    revocationConditions: "",
    jurisdictionCode: "US" as "US" | "EU" | "UK" | "CA" | "JP" | "SG" | "AU" | "INTL",
    arbitrationAgreed: false,
    indemnificationAgreed: false,
    customTerms: "",
    linkP2pTransaction: false,
    p2pSenderWallet: "",
    p2pReceiverWallet: "",
    p2pTransactionHash: "",
    p2pTransactionAmount: "",
    p2pTransactionCurrency: "SOL",
    p2pTransactionNote: "",
  });

  const JURISDICTION_OPTIONS = [
    {
      code: "US",
      name: "United States",
      description: "Delaware law, AAA arbitration, DMCA compliance",
    },
    {
      code: "EU",
      name: "European Union",
      description: "GDPR compliant, ICC arbitration, moral rights preserved",
    },
    {
      code: "UK",
      name: "United Kingdom",
      description: "UK GDPR, LCIA arbitration, Consumer Rights Act",
    },
    {
      code: "CA",
      name: "Canada",
      description: "PIPEDA compliant, bilingual support, moral rights",
    },
    {
      code: "JP",
      name: "Japan",
      description: "APPI compliant, JCAA arbitration, strong moral rights",
    },
    { code: "SG", name: "Singapore", description: "PDPA compliant, SIAC arbitration" },
    { code: "AU", name: "Australia", description: "Privacy Act, ACICA arbitration, consumer law" },
    {
      code: "INTL",
      name: "International",
      description: "UNIDROIT principles, UNCITRAL arbitration, neutral venue",
    },
  ];

  const { data: logos, isLoading: logosLoading } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
  });

  const selectedLogo = logos?.find((l) => l.id === selectedLogoId);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/licenses/contracts", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "License Contract Created",
        description: "Your license contract has been created and is ready for signing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      navigate(`/licenses/${data.contract.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey === "custom") return;

    const template = LICENSE_TEMPLATES[templateKey as keyof typeof LICENSE_TEMPLATES];
    if (!template) return;

    setFormData((prev) => ({
      ...prev,
      licenseType: template.type as typeof formData.licenseType,
      platformBitmap: template.platformBitmap,
      isPerpetual: template.isPerpetual,
      durationDays: "durationDays" in template ? template.durationDays : 365,
      canTransfer: template.canTransfer,
      canSublicense: template.canSublicense,
      canModify: template.canModify,
      requiresAttribution: template.requiresAttribution,
    }));
  };

  const togglePlatform = (platformKey: string) => {
    const bit = PLATFORM_BITS[platformKey as keyof typeof PLATFORM_BITS];
    setFormData((prev) => ({
      ...prev,
      platformBitmap: prev.platformBitmap ^ (1 << bit),
    }));
  };

  const isPlatformEnabled = (platformKey: string): boolean => {
    const bit = PLATFORM_BITS[platformKey as keyof typeof PLATFORM_BITS];
    return (formData.platformBitmap & (1 << bit)) !== 0;
  };

  const enabledPlatforms = getPermittedPlatforms(formData.platformBitmap);

  const handleSubmit = () => {
    if (!selectedLogoId || !formData.licenseeWallet) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.licenseeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.licenseeEmail)) {
      setLicenseeEmailError("Enter a valid email address (e.g., name@domain.com)");
      toast({
        title: "Invalid Email",
        description: "Please enter a valid licensee email address",
        variant: "destructive",
      });
      return;
    }

    if (!formData.arbitrationAgreed || !formData.indemnificationAgreed) {
      toast({
        title: "Legal Agreement Required",
        description: "You must agree to arbitration and indemnification terms",
        variant: "destructive",
      });
      return;
    }

    const {
      linkP2pTransaction,
      p2pSenderWallet,
      p2pReceiverWallet,
      p2pTransactionHash,
      p2pTransactionAmount,
      p2pTransactionCurrency,
      p2pTransactionNote,
      ...restFormData
    } = formData;

    createMutation.mutate({
      logoId: selectedLogoId,
      templateUsed: selectedTemplate,
      ...restFormData,
      exclusivityEndsAt: formData.isExclusivityTimeLimited
        ? new Date(Date.now() + formData.exclusivityDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      ...(linkP2pTransaction && p2pTransactionHash
        ? {
            p2pSenderWallet,
            p2pReceiverWallet,
            p2pTransactionHash,
            p2pTransactionAmount: p2pTransactionAmount || null,
            p2pTransactionCurrency: p2pTransactionCurrency || null,
            p2pTransactionNote: p2pTransactionNote || null,
            p2pTransactionLinkedAt: new Date().toISOString(),
          }
        : {}),
    });
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!selectedLogoId;
      case 2:
        return true;
      case 3:
        return formData.platformBitmap > 0 || formData.otherPlatforms.length > 0;
      case 4:
        return true;
      case 5:
        return formData.isPerpetual || formData.durationDays > 0;
      case 6:
        return true;
      case 7:
        return formData.arbitrationAgreed && formData.indemnificationAgreed;
      case 8:
        return !!formData.licenseeWallet;
      default:
        return true;
    }
  };

  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  useEffect(() => {
    document.title = "Create License Contract - Solturio";
  }, []);

  if (logosLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logos || logos.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <Shield className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2">No Artwork to License</h1>
          <p className="text-lg text-muted-foreground mb-6">
            You need to register your logos and artwork first before creating license contracts.
          </p>
          <Button size="lg" onClick={() => navigate("/upload")} data-testid="button-upload-artwork">
            <Upload className="w-4 h-4 mr-2" />
            Upload Your First Artwork
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/collections")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collections
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create License Smart Contract</h1>
        <p className="text-muted-foreground">
          Create a blockchain-verified license agreement for your intellectual property
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep} of {WIZARD_STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {WIZARD_STEPS[currentStep - 1]?.name}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${step.id <= currentStep ? "text-primary" : "text-muted-foreground"}`}
            >
              <step.icon className="w-4 h-4" />
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Select Artwork to License</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose from your registered intellectual property
                </p>
                <Select value={selectedLogoId} onValueChange={setSelectedLogoId}>
                  <SelectTrigger data-testid="select-artwork" className="w-full">
                    <SelectValue placeholder="Select your artwork..." />
                  </SelectTrigger>
                  <SelectContent>
                    {logos.map((logo) => (
                      <SelectItem key={logo.id} value={logo.id}>
                        {logo.fileName} - #{logo.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLogo && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex gap-4">
                      {selectedLogo.thumbnailUrl && (
                        <img
                          src={selectedLogo.thumbnailUrl}
                          alt={selectedLogo.fileName}
                          className="w-24 h-24 object-contain rounded border"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiUyM2FhYSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIzIiB5PSIzIiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIvPjxwYXRoIGQ9Im0yMSAxNS0zLjA4Ni0zLjA4NmEyIDIgMCAwIDAtMi44MjggMEw2IDIxIi8+PC9zdmc+'; }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{selectedLogo.fileName}</h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {selectedLogo.id.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Registered: {new Date(selectedLogo.createdAt!).toLocaleDateString()}
                        </p>
                        {selectedLogo.nftAddress && (
                          <Badge variant="secondary" className="mt-2">
                            <Sparkles className="w-3 h-3 mr-1" />
                            NFT Minted
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              <div>
                <Label className="text-lg font-semibold">Quick Templates</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Start with a pre-configured template or build custom terms
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Card
                    className={`cursor-pointer hover-elevate ${selectedTemplate === "custom" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => applyTemplate("custom")}
                    data-testid="template-custom"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Custom</Badge>
                        <span className="font-medium">Custom License</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Build your own terms from scratch
                      </p>
                    </CardContent>
                  </Card>

                  {Object.entries(LICENSE_TEMPLATES).map(([key, template]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer hover-elevate ${selectedTemplate === key ? "ring-2 ring-primary" : ""}`}
                      onClick={() => applyTemplate(key)}
                      data-testid={`template-${key.toLowerCase()}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge>{template.name}</Badge>
                          {template.type === "exclusive" && (
                            <Badge variant="secondary">Exclusive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {TEMPLATE_DESCRIPTIONS[key]}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">License Type</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose the type of rights being granted
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      value: "non_exclusive",
                      label: "Non-Exclusive",
                      desc: "You can license to multiple parties",
                    },
                    {
                      value: "exclusive",
                      label: "Exclusive",
                      desc: "Only this licensee can use the asset",
                    },
                    {
                      value: "work_for_hire",
                      label: "Work for Hire",
                      desc: "Client paid for creation, gains full rights",
                    },
                    {
                      value: "full_transfer",
                      label: "Full Transfer",
                      desc: "Complete ownership transfer (buyout)",
                    },
                  ].map((option) => (
                    <Card
                      key={option.value}
                      className={`cursor-pointer hover-elevate ${formData.licenseType === option.value ? "ring-2 ring-primary" : ""}`}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          licenseType: option.value as typeof formData.licenseType,
                        }))
                      }
                      data-testid={`license-type-${option.value}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.label}</span>
                          {formData.licenseType === option.value && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold">Usage Purpose</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { value: "personal", label: "Personal Only" },
                    { value: "commercial", label: "Commercial Only" },
                    { value: "both", label: "Personal & Commercial" },
                  ].map((option) => (
                    <Card
                      key={option.value}
                      className={`cursor-pointer hover-elevate ${formData.usagePurpose === option.value ? "ring-2 ring-primary" : ""}`}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          usagePurpose: option.value as typeof formData.usagePurpose,
                        }))
                      }
                      data-testid={`usage-purpose-${option.value}`}
                    >
                      <CardContent className="p-3 text-center">
                        <span className="font-medium text-sm">{option.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Platform Permissions</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select where the licensee can use your intellectual property
                </p>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, platformBitmap: 0b111111111111 }))
                    }
                    data-testid="button-select-all-platforms"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, platformBitmap: 0 }))}
                    data-testid="button-clear-platforms"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {PLATFORM_INFO.map((platform) => (
                    <Card
                      key={platform.key}
                      className={`cursor-pointer hover-elevate ${isPlatformEnabled(platform.key) ? "ring-2 ring-primary bg-primary/5" : ""}`}
                      onClick={() => togglePlatform(platform.key)}
                      data-testid={`platform-${platform.key.toLowerCase()}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{platform.label}</span>
                          <Checkbox checked={isPlatformEnabled(platform.key)} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{platform.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="other-platforms">Other Platforms</Label>
                <Input
                  id="other-platforms"
                  value={formData.otherPlatforms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, otherPlatforms: e.target.value }))
                  }
                  placeholder="Specify any additional platforms not listed above..."
                  className="mt-2"
                  data-testid="input-other-platforms"
                />
              </div>

              {enabledPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium">Selected:</span>
                  {enabledPlatforms.map((p) => (
                    <Badge key={p} variant="secondary">
                      {p.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Rights Granted</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Define what the licensee can do with your intellectual property
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Can Transfer Rights</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow licensee to transfer this license to others
                    </p>
                  </div>
                  <Switch
                    checked={formData.canTransfer}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, canTransfer: checked }))
                    }
                    data-testid="switch-can-transfer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Can Sublicense</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow licensee to grant sub-licenses to third parties
                    </p>
                  </div>
                  <Switch
                    checked={formData.canSublicense}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, canSublicense: checked }))
                    }
                    data-testid="switch-can-sublicense"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Can Modify</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow licensee to alter, edit, or create derivatives
                    </p>
                  </div>
                  <Switch
                    checked={formData.canModify}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, canModify: checked }))
                    }
                    data-testid="switch-can-modify"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Requires Attribution</Label>
                    <p className="text-sm text-muted-foreground">
                      Licensee must credit you when using the asset
                    </p>
                  </div>
                  <Switch
                    checked={formData.requiresAttribution}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, requiresAttribution: checked }))
                    }
                    data-testid="switch-requires-attribution"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-lg font-semibold">Geographic Scope</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Card
                    className={`cursor-pointer hover-elevate ${formData.geographicScope === "worldwide" ? "ring-2 ring-primary" : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, geographicScope: "worldwide" }))
                    }
                    data-testid="geo-worldwide"
                  >
                    <CardContent className="p-4 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">Worldwide</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer hover-elevate ${formData.geographicScope === "specific" ? "ring-2 ring-primary" : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, geographicScope: "specific" }))
                    }
                    data-testid="geo-specific"
                  >
                    <CardContent className="p-4 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">Specific Regions</span>
                    </CardContent>
                  </Card>
                </div>
                {formData.geographicScope === "specific" && (
                  <Textarea
                    value={formData.geographicDetails}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, geographicDetails: e.target.value }))
                    }
                    placeholder="List the specific regions, countries, or territories..."
                    className="mt-3"
                    data-testid="input-geo-details"
                  />
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">License Duration</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  How long will this license be valid?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={`cursor-pointer hover-elevate ${formData.isPerpetual ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, isPerpetual: true }))}
                    data-testid="duration-perpetual"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">Perpetual</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">License never expires</p>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer hover-elevate ${!formData.isPerpetual ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, isPerpetual: false }))}
                    data-testid="duration-limited"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">Time-Limited</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Set a specific duration</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {!formData.isPerpetual && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="duration-days">Duration (days)</Label>
                    <div className="flex gap-2 mt-2">
                      {[30, 90, 180, 365, 730].map((days) => (
                        <Button
                          key={days}
                          variant={formData.durationDays === days ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData((prev) => ({ ...prev, durationDays: days }))}
                          data-testid={`duration-${days}`}
                        >
                          {days === 365 ? "1 Year" : days === 730 ? "2 Years" : `${days} Days`}
                        </Button>
                      ))}
                    </div>
                    <Input
                      id="duration-days"
                      type="number"
                      value={formData.durationDays}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationDays: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="mt-2 w-32"
                      data-testid="input-duration-days"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">Auto-Renew</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically extend the license when it expires
                      </p>
                    </div>
                    <Switch
                      checked={formData.autoRenew}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, autoRenew: checked }))
                      }
                      data-testid="switch-auto-renew"
                    />
                  </div>

                  {formData.autoRenew && (
                    <div>
                      <Label htmlFor="renewal-notice">Renewal Notice Period (days)</Label>
                      <Input
                        id="renewal-notice"
                        type="number"
                        value={formData.renewalNoticeDays}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            renewalNoticeDays: parseInt(e.target.value) || 30,
                          }))
                        }
                        className="mt-2 w-32"
                        data-testid="input-renewal-notice"
                      />
                    </div>
                  )}
                </div>
              )}

              {formData.licenseType === "exclusive" && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">Time-Limited Exclusivity</Label>
                      <p className="text-sm text-muted-foreground">
                        Exclusivity expires after a period, then becomes non-exclusive
                      </p>
                    </div>
                    <Switch
                      checked={formData.isExclusivityTimeLimited}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isExclusivityTimeLimited: checked }))
                      }
                      data-testid="switch-exclusivity-limited"
                    />
                  </div>
                  {formData.isExclusivityTimeLimited && (
                    <div>
                      <Label htmlFor="exclusivity-days">Exclusivity Period (days)</Label>
                      <Input
                        id="exclusivity-days"
                        type="number"
                        value={formData.exclusivityDays}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            exclusivityDays: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="mt-2 w-32"
                        data-testid="input-exclusivity-days"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Financial Terms</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  These are peer-to-peer payment terms. Solturio does not process these payments.
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>P2P Payment</AlertTitle>
                  <AlertDescription>
                    Any payment amounts listed here are agreements between you and the licensee.
                    Solturio only charges a 0.025 SOL contract deployment fee.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="upfront-amount">Upfront Payment Amount</Label>
                  <Input
                    id="upfront-amount"
                    value={formData.upfrontPaymentAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, upfrontPaymentAmount: e.target.value }))
                    }
                    placeholder="e.g., 100"
                    className="mt-2"
                    data-testid="input-upfront-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="upfront-currency">Currency</Label>
                  <Select
                    value={formData.upfrontPaymentCurrency}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, upfrontPaymentCurrency: v }))
                    }
                  >
                    <SelectTrigger
                      id="upfront-currency"
                      className="mt-2"
                      data-testid="select-currency"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOL">SOL</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="CATH">$CATH</SelectItem>
                      <SelectItem value="USD">USD (Off-chain)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Revenue Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Licensee pays ongoing royalties on revenue
                  </p>
                </div>
                <Switch
                  checked={formData.hasRevenueShare}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, hasRevenueShare: checked }))
                  }
                  data-testid="switch-revenue-share"
                />
              </div>

              {formData.hasRevenueShare && (
                <div>
                  <Label htmlFor="royalty-percentage">Royalty Percentage (%)</Label>
                  <Input
                    id="royalty-percentage"
                    type="number"
                    value={formData.royaltyPercentage}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, royaltyPercentage: e.target.value }))
                    }
                    placeholder="e.g., 5"
                    className="mt-2 w-32"
                    data-testid="input-royalty"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="revocation-conditions">Revocation Conditions (Optional)</Label>
                <Textarea
                  id="revocation-conditions"
                  value={formData.revocationConditions}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, revocationConditions: e.target.value }))
                  }
                  placeholder="Describe conditions under which the license can be revoked..."
                  className="mt-2"
                  data-testid="input-revocation"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Link External Transaction</Label>
                    <p className="text-sm text-muted-foreground">
                      Record a peer-to-peer payment tied to this license
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.linkP2pTransaction}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, linkP2pTransaction: checked }))
                  }
                  data-testid="switch-link-transaction"
                />
              </div>

              {formData.linkP2pTransaction && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      This is optional. If you've already completed a payment between wallets, you
                      can record the transaction details here to tie it to this license. Solturio
                      does not process this payment — it only creates a verifiable link between the
                      transaction and your IP.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="p2p-sender">Sender Wallet Address</Label>
                      <Input
                        id="p2p-sender"
                        value={formData.p2pSenderWallet}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, p2pSenderWallet: e.target.value }))
                        }
                        placeholder="Wallet that sent the payment..."
                        className="mt-2"
                        data-testid="input-p2p-sender"
                      />
                    </div>
                    <div>
                      <Label htmlFor="p2p-receiver">Receiver Wallet Address</Label>
                      <Input
                        id="p2p-receiver"
                        value={formData.p2pReceiverWallet}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, p2pReceiverWallet: e.target.value }))
                        }
                        placeholder="Wallet that received the payment..."
                        className="mt-2"
                        data-testid="input-p2p-receiver"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="p2p-tx-hash">Transaction Hash / Signature</Label>
                    <Input
                      id="p2p-tx-hash"
                      value={formData.p2pTransactionHash}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, p2pTransactionHash: e.target.value }))
                      }
                      placeholder="On-chain transaction hash..."
                      className="mt-2 font-mono text-sm"
                      data-testid="input-p2p-tx-hash"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="p2p-amount">Amount (Optional)</Label>
                      <Input
                        id="p2p-amount"
                        value={formData.p2pTransactionAmount}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, p2pTransactionAmount: e.target.value }))
                        }
                        placeholder="e.g., 50"
                        className="mt-2"
                        data-testid="input-p2p-amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="p2p-currency">Currency</Label>
                      <Select
                        value={formData.p2pTransactionCurrency}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, p2pTransactionCurrency: v }))
                        }
                      >
                        <SelectTrigger
                          id="p2p-currency"
                          className="mt-2"
                          data-testid="select-p2p-currency"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOL">SOL</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="CATH">$CATH</SelectItem>
                          <SelectItem value="BONK">BONK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="p2p-note">Note (Optional)</Label>
                    <Input
                      id="p2p-note"
                      value={formData.p2pTransactionNote}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, p2pTransactionNote: e.target.value }))
                      }
                      placeholder="e.g., License payment for logo usage"
                      className="mt-2"
                      data-testid="input-p2p-note"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Legal Agreements & Jurisdiction</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the governing jurisdiction and agree to required terms
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Governing Jurisdiction</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the legal framework that will govern this license agreement
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {JURISDICTION_OPTIONS.map((j) => (
                      <div
                        key={j.code}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            jurisdictionCode: j.code as typeof formData.jurisdictionCode,
                          }))
                        }
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.jurisdictionCode === j.code
                            ? "border-primary bg-primary/10"
                            : "hover-elevate"
                        }`}
                        data-testid={`jurisdiction-${j.code.toLowerCase()}`}
                      >
                        <div className="font-medium text-sm">{j.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {j.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(formData.jurisdictionCode === "EU" || formData.jurisdictionCode === "UK") && (
                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <AlertTitle className="text-blue-600">GDPR Compliance</AlertTitle>
                    <AlertDescription className="text-sm">
                      This jurisdiction requires GDPR compliance. Personal data will be processed
                      according to GDPR requirements. Data subjects retain rights under Articles
                      15-22.
                    </AlertDescription>
                  </Alert>
                )}

                {formData.jurisdictionCode === "CA" && (
                  <Alert className="bg-amber-500/10 border-amber-500/20">
                    <Globe className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-600">Canadian Requirements</AlertTitle>
                    <AlertDescription className="text-sm">
                      This jurisdiction requires PIPEDA compliance. For Quebec users, bilingual
                      documentation is available.
                    </AlertDescription>
                  </Alert>
                )}

                {formData.jurisdictionCode === "JP" && (
                  <Alert className="bg-rose-500/10 border-rose-500/20">
                    <Globe className="h-4 w-4 text-rose-500" />
                    <AlertTitle className="text-rose-600">Japanese Requirements</AlertTitle>
                    <AlertDescription className="text-sm">
                      Japan strongly protects moral rights (著作者人格権). These cannot be waived
                      under this agreement.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <Alert variant="destructive" className="bg-destructive/10">
                <Scale className="h-4 w-4" />
                <AlertTitle>Required Agreements</AlertTitle>
                <AlertDescription>
                  Both agreements below are mandatory for creating a license smart contract.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="arbitration"
                      checked={formData.arbitrationAgreed}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, arbitrationAgreed: checked as boolean }))
                      }
                      data-testid="checkbox-arbitration"
                    />
                    <div className="flex-1">
                      <Label htmlFor="arbitration" className="font-medium cursor-pointer">
                        Arbitration Agreement
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Any disputes arising from this license will be resolved through binding
                        arbitration rather than court litigation. Both parties waive the right to a
                        jury trial.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="indemnification"
                      checked={formData.indemnificationAgreed}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          indemnificationAgreed: checked as boolean,
                        }))
                      }
                      data-testid="checkbox-indemnification"
                    />
                    <div className="flex-1">
                      <Label htmlFor="indemnification" className="font-medium cursor-pointer">
                        Indemnification Agreement
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Both parties agree to indemnify and hold harmless Solturio and its
                        affiliates from any claims, damages, or expenses arising from this license
                        agreement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="custom-terms">Additional Custom Terms (Optional)</Label>
                <Textarea
                  id="custom-terms"
                  value={formData.customTerms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customTerms: e.target.value }))
                  }
                  placeholder="Add any additional terms or conditions..."
                  className="mt-2"
                  rows={4}
                  data-testid="input-custom-terms"
                />
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Review & Licensee Details</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Review your license terms and enter the licensee's wallet address
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licensee-wallet">Licensee Wallet Address *</Label>
                  <Input
                    id="licensee-wallet"
                    value={formData.licenseeWallet}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, licenseeWallet: e.target.value }))
                    }
                    placeholder="Solana wallet address..."
                    className="mt-2"
                    data-testid="input-licensee-wallet"
                  />
                </div>
                <div>
                  <Label htmlFor="licensee-name">Licensee Name</Label>
                  <Input
                    id="licensee-name"
                    value={formData.licenseeName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, licenseeName: e.target.value }))
                    }
                    placeholder="Optional display name..."
                    className="mt-2"
                    data-testid="input-licensee-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="licensee-email">Licensee Email</Label>
                <Input
                  id="licensee-email"
                  type="email"
                  value={formData.licenseeEmail}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, licenseeEmail: e.target.value }));
                    setLicenseeEmailError("");
                  }}
                  onBlur={() => {
                    if (formData.licenseeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.licenseeEmail)) {
                      setLicenseeEmailError("Enter a valid email address (e.g., name@domain.com)");
                    } else {
                      setLicenseeEmailError("");
                    }
                  }}
                  placeholder="Optional contact email..."
                  className="mt-2"
                  data-testid="input-licensee-email"
                />
                {licenseeEmailError && <p className="text-sm text-destructive mt-1">{licenseeEmailError}</p>}
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Asset Information</h3>
                <div className="flex items-start gap-4">
                  {selectedLogo?.thumbnailUrl && (
                    <img
                      src={selectedLogo.thumbnailUrl}
                      alt={selectedLogo.fileName}
                      className="w-20 h-20 rounded-lg object-cover border"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiUyM2FhYSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIzIiB5PSIzIiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIvPjxwYXRoIGQ9Im0yMSAxNS0zLjA4Ni0zLjA4NmEyIDIgMCAwIDAtMi44MjggMEw2IDIxIi8+PC9zdmc+'; }}
                    />
                  )}
                  <div className="flex-1 text-sm space-y-2">
                    <div>
                      <span className="text-muted-foreground">File Name:</span>
                      <p className="font-medium">{selectedLogo?.fileName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Registered:</span>
                      <p className="font-medium">
                        {selectedLogo?.createdAt
                          ? new Date(selectedLogo.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                    {selectedLogo?.colorPalette && selectedLogo.colorPalette.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Color Palette:</span>
                        <div className="flex gap-1 mt-1">
                          {selectedLogo.colorPalette.slice(0, 6).map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">License Summary</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Template:</span>
                    <p className="font-medium">
                      {selectedTemplate === "custom"
                        ? "Custom"
                        : LICENSE_TEMPLATES[selectedTemplate as keyof typeof LICENSE_TEMPLATES]
                            ?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">License Type:</span>
                    <p className="font-medium capitalize">
                      {formData.licenseType.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">
                      {formData.isPerpetual ? "Perpetual" : `${formData.durationDays} days`}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Jurisdiction:</span>
                    <p className="font-medium">
                      {JURISDICTION_OPTIONS.find((j) => j.code === formData.jurisdictionCode)
                        ?.name || formData.jurisdictionCode}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Platforms:</span>
                    <p className="font-medium">
                      {enabledPlatforms.length > 0
                        ? enabledPlatforms.join(", ").replace(/_/g, " ")
                        : "None selected"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Geographic Scope:</span>
                    <p className="font-medium capitalize">{formData.geographicScope}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Rights:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.canTransfer && <Badge variant="secondary">Transfer</Badge>}
                      {formData.canSublicense && <Badge variant="secondary">Sublicense</Badge>}
                      {formData.canModify && <Badge variant="secondary">Modify</Badge>}
                      {formData.requiresAttribution && (
                        <Badge variant="outline">Attribution Required</Badge>
                      )}
                    </div>
                  </div>
                  {formData.upfrontPaymentAmount && (
                    <div>
                      <span className="text-muted-foreground">Upfront Payment:</span>
                      <p className="font-medium">
                        {formData.upfrontPaymentAmount} {formData.upfrontPaymentCurrency}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {formData.linkP2pTransaction && formData.p2pTransactionHash && (
                <div
                  className="bg-muted/50 rounded-lg p-4 space-y-3"
                  data-testid="review-p2p-transaction"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Linked Transaction
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sender:</span>
                      <p className="font-mono text-xs break-all">{formData.p2pSenderWallet}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Receiver:</span>
                      <p className="font-mono text-xs break-all">{formData.p2pReceiverWallet}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Transaction Hash:</span>
                      <p className="font-mono text-xs break-all">{formData.p2pTransactionHash}</p>
                    </div>
                    {formData.p2pTransactionAmount && (
                      <div>
                        <span className="text-muted-foreground">Amount:</span>
                        <p className="font-medium">
                          {formData.p2pTransactionAmount} {formData.p2pTransactionCurrency}
                        </p>
                      </div>
                    )}
                    {formData.p2pTransactionNote && (
                      <div>
                        <span className="text-muted-foreground">Note:</span>
                        <p>{formData.p2pTransactionNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertTitle>Deployment Fee: 0.025 SOL</AlertTitle>
                <AlertDescription>
                  A one-time fee is required to deploy this license as a smart contract on Solana.
                  The fee will be collected after both parties sign.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            data-testid="button-prev-step"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < WIZARD_STEPS.length ? (
            <Button
              onClick={() => setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1))}
              disabled={!canProceed()}
              data-testid="button-next-step"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createMutation.isPending}
              data-testid="button-create-license"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Create License Contract
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

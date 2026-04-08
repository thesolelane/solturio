import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Download,
  Scale,
  Shield,
  Info,
  Building2,
  User,
  Package,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Logo } from "@shared/schema";

const NICE_CLASSES = [
  { code: "001", label: "Class 1 — Chemicals" },
  { code: "002", label: "Class 2 — Paints, varnishes, lacquers" },
  { code: "003", label: "Class 3 — Cosmetics, cleaning preparations" },
  { code: "004", label: "Class 4 — Oils, lubricants, fuels" },
  { code: "005", label: "Class 5 — Pharmaceuticals, medical preparations" },
  { code: "006", label: "Class 6 — Metals, hardware" },
  { code: "007", label: "Class 7 — Machines, machine tools" },
  { code: "008", label: "Class 8 — Hand tools, cutlery" },
  { code: "009", label: "Class 9 — Scientific/electrical apparatus, software" },
  { code: "010", label: "Class 10 — Medical, surgical instruments" },
  { code: "011", label: "Class 11 — Lighting, heating, cooling apparatus" },
  { code: "012", label: "Class 12 — Vehicles, transportation" },
  { code: "013", label: "Class 13 — Firearms, ammunition" },
  { code: "014", label: "Class 14 — Jewelry, precious metals" },
  { code: "015", label: "Class 15 — Musical instruments" },
  { code: "016", label: "Class 16 — Paper, printed matter, stationery" },
  { code: "017", label: "Class 17 — Rubber, plastics goods" },
  { code: "018", label: "Class 18 — Leather goods, bags" },
  { code: "019", label: "Class 19 — Building materials" },
  { code: "020", label: "Class 20 — Furniture, frames, containers" },
  { code: "021", label: "Class 21 — Household utensils, glassware" },
  { code: "022", label: "Class 22 — Ropes, cordage, fibers" },
  { code: "023", label: "Class 23 — Yarns, threads" },
  { code: "024", label: "Class 24 — Textiles, fabrics" },
  { code: "025", label: "Class 25 — Clothing, footwear, headgear" },
  { code: "026", label: "Class 26 — Lace, embroidery, ribbons" },
  { code: "027", label: "Class 27 — Carpets, rugs, mats" },
  { code: "028", label: "Class 28 — Games, toys, sports equipment" },
  { code: "029", label: "Class 29 — Meat, fish, poultry, preserved foods" },
  { code: "030", label: "Class 30 — Coffee, tea, bread, pastries" },
  { code: "031", label: "Class 31 — Agricultural products, live animals" },
  { code: "032", label: "Class 32 — Beer, soft drinks, juices" },
  { code: "033", label: "Class 33 — Alcoholic beverages (except beer)" },
  { code: "034", label: "Class 34 — Tobacco, smoking articles" },
  { code: "035", label: "Class 35 — Advertising, business management" },
  { code: "036", label: "Class 36 — Finance, banking, insurance" },
  { code: "037", label: "Class 37 — Construction, repair, installation" },
  { code: "038", label: "Class 38 — Telecommunications" },
  { code: "039", label: "Class 39 — Transportation, travel" },
  { code: "040", label: "Class 40 — Material treatment, manufacturing" },
  { code: "041", label: "Class 41 — Education, entertainment, sports" },
  { code: "042", label: "Class 42 — Scientific/technological services, software" },
  { code: "043", label: "Class 43 — Food service, temporary accommodations" },
  { code: "044", label: "Class 44 — Medical, veterinary, beauty services" },
  { code: "045", label: "Class 45 — Legal, personal, social services" },
];

const ID_MANUAL_SUGGESTIONS: Record<string, string[]> = {
  "009": [
    "Computer software for [specific purpose]",
    "Downloadable mobile applications for [specific purpose]",
    "Blockchain-based software for verifying intellectual property",
    "Cryptocurrency software",
  ],
  "042": [
    "Software as a service (SaaS) featuring [specific function]",
    "Platform as a service (PaaS) featuring cloud computing",
    "Providing temporary use of online non-downloadable software",
  ],
  "035": [
    "Online marketplace services for [specific goods/services]",
    "Business management consulting services",
    "Advertising services",
  ],
  "036": [
    "Financial services, namely [specific service]",
    "Digital asset exchange services",
    "Cryptocurrency payment processing services",
  ],
  "041": [
    "Entertainment services, namely [specific description]",
    "Educational services, namely providing online training",
    "Providing a website featuring [specific content]",
  ],
};

const STEPS = [
  { id: 1, title: "Mark Type", icon: Scale },
  { id: 2, title: "Mark Description", icon: FileText },
  { id: 3, title: "Goods & Services", icon: Package },
  { id: 4, title: "Filing Basis", icon: Shield },
  { id: 5, title: "Specimen Guide", icon: Star },
  { id: 6, title: "Applicant Info", icon: User },
];

interface WizardData {
  selectedLogoId: string;
  markType: "word" | "design" | "combined" | "";
  markDescription: string;
  selectedClasses: string[];
  goodsServicesDescriptions: Record<string, string>;
  useIdManual: boolean;
  filingBasis: "use_in_commerce" | "intent_to_use" | "";
  applicantName: string;
  applicantAddress: string;
  applicantCity: string;
  applicantState: string;
  applicantZip: string;
  applicantCountry: string;
  entityType: "individual" | "corporation" | "llc" | "partnership" | "";
  citizenship: string;
  colorClaim: string;
  hasColorClaim: boolean;
}

interface ApplicantErrors {
  applicantName?: string;
  applicantCountry?: string;
  applicantState?: string;
  applicantZip?: string;
}

function validateApplicantInfo(data: WizardData): ApplicantErrors {
  const errors: ApplicantErrors = {};
  if (!data.applicantName.trim()) {
    errors.applicantName = "Legal name is required.";
  }
  const country = data.applicantCountry.trim().toUpperCase();
  if (!country) {
    errors.applicantCountry = "Country is required.";
  }
  if (country === "US") {
    if (!data.applicantState.trim()) {
      errors.applicantState = "State is required for US applicants.";
    }
    const zip = data.applicantZip.trim();
    if (!zip) {
      errors.applicantZip = "ZIP code is required for US applicants.";
    } else if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      errors.applicantZip = "Enter a valid ZIP code (e.g., 12345 or 12345-6789).";
    }
  }
  return errors;
}

const DEFAULT_WIZARD_DATA: WizardData = {
  selectedLogoId: "",
  markType: "",
  markDescription: "",
  selectedClasses: [],
  goodsServicesDescriptions: {},
  useIdManual: true,
  filingBasis: "",
  applicantName: "",
  applicantAddress: "",
  applicantCity: "",
  applicantState: "",
  applicantZip: "",
  applicantCountry: "",
  entityType: "",
  citizenship: "US",
  colorClaim: "",
  hasColorClaim: false,
};

export default function TrademarkAssistant() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("search");
  const [searchMarkName, setSearchMarkName] = useState("");
  const [searchNiceClass, setSearchNiceClass] = useState("all");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [wizardComplete, setWizardComplete] = useState(false);
  const [applicantErrors, setApplicantErrors] = useState<ApplicantErrors>({});
  const [applicantTouched, setApplicantTouched] = useState<Record<string, boolean>>({});
  const summaryRef = useRef<HTMLDivElement>(null);

  const { data: logos = [] } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const handleSearch = async () => {
    if (!searchMarkName.trim()) {
      toast({ title: "Enter a mark name to search", variant: "destructive" });
      return;
    }
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const params = new URLSearchParams({ markName: searchMarkName.trim() });
      if (searchNiceClass && searchNiceClass !== "all") params.set("niceClass", searchNiceClass);
      const res = await fetch(`/api/trademark/search?${params}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results || []);
      toast({
        title: `Found ${data.results?.length || 0} results`,
        description: data.disclaimer,
      });
    } catch {
      toast({ title: "Search failed", description: "Could not reach USPTO API", variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  };

  const updateWizard = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const selectedLogo = logos.find((l) => l.id === wizardData.selectedLogoId);

  const numClasses = wizardData.selectedClasses.length;
  const hasFreeFormDescriptions = !wizardData.useIdManual;
  const missingInfo = getMissingInfoCount(wizardData);
  const baseFee = 350;
  const freeFormSurcharge = hasFreeFormDescriptions ? 200 : 0;
  const missingInfoSurcharge = missingInfo > 0 ? 100 : 0;
  const totalPerClass = baseFee + freeFormSurcharge + missingInfoSurcharge;
  const totalFee = Math.max(numClasses, 1) * totalPerClass;

  function getMissingInfoCount(data: WizardData): number {
    let missing = 0;
    if (!data.markType) missing++;
    if (!data.markDescription.trim()) missing++;
    if (!data.filingBasis) missing++;
    if (!data.applicantName.trim()) missing++;
    if (!data.entityType) missing++;
    return missing;
  }

  const handleWizardLogoSelect = (logoId: string) => {
    const logo = logos.find((l) => l.id === logoId);
    if (logo) {
      updateWizard({
        selectedLogoId: logoId,
        markDescription: logo.description || logo.fileName || "",
        markType: "design",
      });
    }
  };

  const canProceedStep = (step: number): boolean => {
    switch (step) {
      case 1: return wizardData.markType !== "";
      case 2: return wizardData.markDescription.trim().length > 0;
      case 3: return wizardData.selectedClasses.length > 0;
      case 4: return wizardData.filingBasis !== "";
      case 5: return true;
      case 6: {
        const errs = validateApplicantInfo(wizardData);
        return Object.keys(errs).length === 0 && wizardData.entityType !== "";
      }
      default: return false;
    }
  };

  const handleApplicantBlur = (field: string) => {
    setApplicantTouched((prev) => ({ ...prev, [field]: true }));
    setApplicantErrors(validateApplicantInfo(wizardData));
  };

  const handleDownloadSummary = () => {
    if (!summaryRef.current) return;
    const content = generateTextSummary(wizardData, selectedLogo, totalFee, user);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trademark-application-checklist-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Checklist downloaded", description: "Review it before visiting TEAS" });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Trademark Filing Assistant</h1>
        <p className="text-muted-foreground">
          Prepare your USPTO trademark application with guidance from your registered Solturio artwork.
        </p>
        <Alert className="mt-4">
          <Scale className="w-4 h-4" />
          <AlertTitle>Legal Disclaimer</AlertTitle>
          <AlertDescription>
            Solturio is not a law firm. This tool provides educational guidance only and is not legal advice. Always consult a licensed trademark attorney before filing. Actual filing is done by you on the USPTO TEAS platform.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="search" data-testid="tab-search">
            <Search className="w-4 h-4 mr-2" />
            Infringement Search
          </TabsTrigger>
          <TabsTrigger value="wizard" data-testid="tab-wizard">
            <FileText className="w-4 h-4 mr-2" />
            Application Builder
          </TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">
            <DollarSign className="w-4 h-4 mr-2" />
            Cost Estimator
          </TabsTrigger>
        </TabsList>

        {/* SEARCH TAB */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                USPTO Trademark Similarity Search
              </CardTitle>
              <CardDescription>
                Check for potentially conflicting marks before filing. Results come from USPTO records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="search-mark-name">Mark Name</Label>
                  <Input
                    id="search-mark-name"
                    data-testid="input-search-mark-name"
                    placeholder="Enter your proposed trademark name..."
                    value={searchMarkName}
                    onChange={(e) => setSearchMarkName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nice-class">Goods/Services Class (Optional)</Label>
                  <Select value={searchNiceClass} onValueChange={setSearchNiceClass}>
                    <SelectTrigger id="nice-class" data-testid="select-nice-class">
                      <SelectValue placeholder="Any class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {NICE_CLASSES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleSearch}
                disabled={searchLoading || !searchMarkName.trim()}
                data-testid="button-trademark-search"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search USPTO Records
              </Button>

              {searchLoading && (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching USPTO trademark database...</span>
                </div>
              )}

              {searchResults && searchResults.length === 0 && (
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertTitle>No Conflicts Found</AlertTitle>
                  <AlertDescription>
                    No similar marks were found in the selected class. This is a good sign, but a professional clearance search is still recommended before filing.
                  </AlertDescription>
                </Alert>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Preliminary Screening — Not a Legal Clearance Opinion</AlertTitle>
                    <AlertDescription>
                      {searchResults.length} potentially similar mark(s) found. Review each carefully and consult a trademark attorney.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    {searchResults.map((result, idx) => (
                      <Card key={idx} data-testid={`card-trademark-result-${idx}`}>
                        <CardContent className="pt-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-lg">{result.markName || result.wordMark || "Design Mark"}</span>
                                <Badge
                                  variant={result.status === "LIVE" ? "default" : "secondary"}
                                  data-testid={`badge-status-${idx}`}
                                >
                                  {result.status === "LIVE" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                  {result.status}
                                </Badge>
                                <Badge
                                  variant={result.conflictRisk === "HIGH" ? "destructive" : result.conflictRisk === "MEDIUM" ? "outline" : "secondary"}
                                  data-testid={`badge-risk-${idx}`}
                                >
                                  {result.conflictRisk} RISK
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <Building2 className="w-3 h-3 inline mr-1" />
                                {result.owner}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Filed: {result.filingDate || "Unknown"}
                                {result.registrationDate && ` · Registered: ${result.registrationDate}`}
                              </p>
                              {result.goodsServices && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {result.goodsServices}
                                </p>
                              )}
                              {result.niceClasses && result.niceClasses.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {result.niceClasses.map((cls: string) => (
                                    <Badge key={cls} variant="outline" className="text-xs">
                                      Class {cls}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {result.serialNumber && (
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">Serial #{result.serialNumber}</p>
                                <a
                                  href={`https://tsdr.uspto.gov/#caseNumber=${result.serialNumber}&caseType=SERIAL_NO&searchType=statusSearch`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs flex items-center gap-1 text-primary hover:underline"
                                >
                                  View on USPTO <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WIZARD TAB */}
        <TabsContent value="wizard">
          {!wizardComplete ? (
            <div className="space-y-6">
              {/* Step Progress */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {STEPS.map((step, idx) => {
                  const StepIcon = step.icon;
                  const isActive = wizardStep === step.id;
                  const isCompleted = wizardStep > step.id;
                  return (
                    <div key={step.id} className="flex items-center gap-1 shrink-0">
                      <button
                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : isCompleted
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => isCompleted && setWizardStep(step.id)}
                        data-testid={`step-${step.id}`}
                      >
                        <StepIcon className="w-4 h-4" />
                        <span className="text-xs whitespace-nowrap">{step.title}</span>
                      </button>
                      {idx < STEPS.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step 1: Mark Type */}
              {wizardStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 1: Select Mark Type</CardTitle>
                    <CardDescription>Choose your registered Solturio artwork and the type of trademark you are applying for.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {logos.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="wizard-logo">Pre-populate from Solturio Artwork (Optional)</Label>
                        <Select value={wizardData.selectedLogoId} onValueChange={handleWizardLogoSelect}>
                          <SelectTrigger id="wizard-logo" data-testid="select-wizard-logo">
                            <SelectValue placeholder="Select a registered artwork..." />
                          </SelectTrigger>
                          <SelectContent>
                            {logos.map((logo) => (
                              <SelectItem key={logo.id} value={logo.id}>
                                {logo.fileName} — {new Date(logo.createdAt!).toLocaleDateString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedLogo && (
                          <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                            <p><strong>File:</strong> {selectedLogo.fileName}</p>
                            <p><strong>SHA-256:</strong> <span className="font-mono text-xs">{selectedLogo.fileHash}</span></p>
                            <p><strong>Registered:</strong> {new Date(selectedLogo.createdAt!).toLocaleDateString()} (prior art)</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Mark Type</Label>
                      <div className="grid md:grid-cols-3 gap-3">
                        {(["word", "design", "combined"] as const).map((type) => (
                          <button
                            key={type}
                            data-testid={`button-mark-type-${type}`}
                            className={`border rounded-md p-4 text-left transition-colors hover-elevate ${
                              wizardData.markType === type
                                ? "border-primary bg-primary/10"
                                : "border-border"
                            }`}
                            onClick={() => updateWizard({ markType: type })}
                          >
                            <h3 className="font-semibold capitalize mb-1">{type === "combined" ? "Combined" : type === "word" ? "Word Mark" : "Design/Logo"}</h3>
                            <p className="text-xs text-muted-foreground">
                              {type === "word" && "Text only — protects the words themselves in any font or style"}
                              {type === "design" && "Image/logo mark — protects the specific graphic design"}
                              {type === "combined" && "Word + design together as a single composite mark"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {wizardData.markType === "design" || wizardData.markType === "combined" ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="has-color-claim"
                            checked={wizardData.hasColorClaim}
                            onChange={(e) => updateWizard({ hasColorClaim: e.target.checked })}
                            data-testid="checkbox-color-claim"
                          />
                          <Label htmlFor="has-color-claim">This mark claims color as a feature</Label>
                        </div>
                        {wizardData.hasColorClaim && (
                          <div className="space-y-1">
                            <Label htmlFor="color-claim">Color Claim Description</Label>
                            <Textarea
                              id="color-claim"
                              data-testid="textarea-color-claim"
                              placeholder="e.g., The color blue (Pantone 2728 C) appearing in the circle element, the color white appearing in the lettering."
                              value={wizardData.colorClaim}
                              onChange={(e) => updateWizard({ colorClaim: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Mark Description */}
              {wizardStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 2: Mark Description</CardTitle>
                    <CardDescription>
                      Provide an accurate description of what your mark looks like. For design marks, describe each element.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mark-description">Description of the Mark</Label>
                      <Textarea
                        id="mark-description"
                        data-testid="textarea-mark-description"
                        placeholder={
                          wizardData.markType === "word"
                            ? "The mark consists of the stylized word 'EXAMPLE' in bold sans-serif lettering."
                            : wizardData.markType === "design"
                            ? "The mark consists of a circular design featuring a stylized letter 'E' in the center with three horizontal lines extending to the right..."
                            : "The mark consists of the word 'EXAMPLE' in bold letters below a circular logo design featuring..."
                        }
                        value={wizardData.markDescription}
                        maxLength={2000}
                        onChange={(e) => updateWizard({ markDescription: e.target.value })}
                        className="min-h-[120px]"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Be precise and complete. Do not use subjective terms like "beautiful" or "unique."
                        </p>
                        <span className={`text-xs shrink-0 ml-2 ${wizardData.markDescription.length >= 2000 ? "text-destructive" : "text-muted-foreground"}`}>
                          {wizardData.markDescription.length}/2000
                        </span>
                      </div>
                    </div>
                    {selectedLogo && (
                      <Alert>
                        <Info className="w-4 h-4" />
                        <AlertTitle>Prior Art from Solturio Registration</AlertTitle>
                        <AlertDescription>
                          Your registration date of {new Date(selectedLogo.createdAt!).toLocaleDateString()} with SHA-256 hash <span className="font-mono text-xs">{selectedLogo.fileHash.slice(0, 16)}...</span> can serve as prior art evidence.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Goods & Services */}
              {wizardStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 3: Goods & Services Classification</CardTitle>
                    <CardDescription>
                      Select Nice Classification classes that cover your goods/services. Each class costs $350 (base).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <input
                        type="checkbox"
                        id="use-id-manual"
                        checked={wizardData.useIdManual}
                        onChange={(e) => updateWizard({ useIdManual: e.target.checked })}
                        data-testid="checkbox-id-manual"
                      />
                      <Label htmlFor="use-id-manual">
                        Use USPTO ID Manual descriptions (saves $200/class surcharge)
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Classes</Label>
                      <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
                        {NICE_CLASSES.map((cls) => {
                          const isSelected = wizardData.selectedClasses.includes(cls.code);
                          return (
                            <label
                              key={cls.code}
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover-elevate ${
                                isSelected ? "bg-primary/10 border border-primary/30" : ""
                              }`}
                              data-testid={`checkbox-class-${cls.code}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateWizard({ selectedClasses: [...wizardData.selectedClasses, cls.code] });
                                  } else {
                                    updateWizard({
                                      selectedClasses: wizardData.selectedClasses.filter((c) => c !== cls.code),
                                      goodsServicesDescriptions: {
                                        ...wizardData.goodsServicesDescriptions,
                                        [cls.code]: undefined as any,
                                      },
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm">{cls.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {wizardData.selectedClasses.length > 0 && (
                      <div className="space-y-3">
                        <Label>Goods/Services Descriptions</Label>
                        {wizardData.selectedClasses.map((code) => {
                          const cls = NICE_CLASSES.find((c) => c.code === code);
                          const suggestions = ID_MANUAL_SUGGESTIONS[code] || [];
                          return (
                            <div key={code} className="space-y-2">
                              <p className="text-sm font-medium">{cls?.label}</p>
                              {wizardData.useIdManual && suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {suggestions.map((s) => (
                                    <Button
                                      key={s}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-auto py-1"
                                      onClick={() =>
                                        updateWizard({
                                          goodsServicesDescriptions: {
                                            ...wizardData.goodsServicesDescriptions,
                                            [code]: s,
                                          },
                                        })
                                      }
                                    >
                                      {s.slice(0, 40)}...
                                    </Button>
                                  ))}
                                </div>
                              )}
                              <Textarea
                                data-testid={`textarea-gs-${code}`}
                                placeholder={`Describe your goods/services for Class ${code}...`}
                                maxLength={1000}
                                value={wizardData.goodsServicesDescriptions[code] || ""}
                                onChange={(e) =>
                                  updateWizard({
                                    goodsServicesDescriptions: {
                                      ...wizardData.goodsServicesDescriptions,
                                      [code]: e.target.value,
                                    },
                                  })
                                }
                              />
                              <div className="flex justify-end">
                                <span className={`text-xs ${(wizardData.goodsServicesDescriptions[code]?.length || 0) >= 1000 ? "text-destructive" : "text-muted-foreground"}`}>
                                  {wizardData.goodsServicesDescriptions[code]?.length || 0}/1000
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Filing Basis */}
              {wizardStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 4: Filing Basis</CardTitle>
                    <CardDescription>
                      Choose whether you are already using the mark in commerce, or intend to use it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {(["use_in_commerce", "intent_to_use"] as const).map((basis) => (
                        <button
                          key={basis}
                          data-testid={`button-filing-basis-${basis}`}
                          className={`border rounded-md p-4 text-left transition-colors hover-elevate ${
                            wizardData.filingBasis === basis
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          }`}
                          onClick={() => updateWizard({ filingBasis: basis })}
                        >
                          <h3 className="font-semibold mb-2">
                            {basis === "use_in_commerce" ? "Use in Commerce (§1(a))" : "Intent to Use (§1(b))"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {basis === "use_in_commerce"
                              ? "You are already using this mark in commerce to sell goods/services. You must submit a specimen showing current use."
                              : "You have a bona fide intent to use this mark in commerce. No specimen needed at filing, but required before registration."}
                          </p>
                        </button>
                      ))}
                    </div>
                    {wizardData.filingBasis && (
                      <Alert>
                        <Info className="w-4 h-4" />
                        <AlertTitle>
                          {wizardData.filingBasis === "use_in_commerce" ? "Specimen Required" : "Statement of Use Needed Later"}
                        </AlertTitle>
                        <AlertDescription>
                          {wizardData.filingBasis === "use_in_commerce"
                            ? "You must submit a specimen showing the mark as actually used in commerce (e.g., product label, website screenshot showing mark in connection with services)."
                            : "After filing, you will have 6 months (extendable up to 36 months total) to submit a Statement of Use showing actual commerce use."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Specimen Guide */}
              {wizardStep === 5 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 5: Specimen Preparation Guide</CardTitle>
                    <CardDescription>
                      A specimen proves your mark is actually used in commerce. Here is what qualifies.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {wizardData.filingBasis === "intent_to_use" ? (
                      <Alert>
                        <Info className="w-4 h-4" />
                        <AlertTitle>No Specimen Needed Yet</AlertTitle>
                        <AlertDescription>
                          Since you selected Intent to Use, you do not need a specimen at filing. You will submit one when you file your Statement of Use after the mark is allowed.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm">For Goods (Products)</h3>
                            <ul className="space-y-2">
                              {[
                                "Label affixed to product packaging showing the mark",
                                "Product tag with mark clearly visible",
                                "Photo of product displaying the mark",
                                "Website screenshot showing mark and purchase button",
                              ].map((item) => (
                                <li key={item} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm">For Services</h3>
                            <ul className="space-y-2">
                              {[
                                "Website screenshot displaying the mark with service offerings",
                                "Digital advertisement showing services rendered",
                                "Business card or brochure (with address/phone)",
                                "Screenshot of app/software showing mark in context",
                              ].map((item) => (
                                <li key={item} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm">Specimens That Do NOT Qualify</h3>
                          <ul className="space-y-1">
                            {[
                              "Mockups or renderings (not actual use)",
                              "Invoices alone (mark must be visible in context)",
                              "Mere announcements or press releases",
                              "Digitally altered photos",
                            ].map((item) => (
                              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {selectedLogo && (
                          <Alert>
                            <Shield className="w-4 h-4" />
                            <AlertTitle>Solturio Registration as Supporting Evidence</AlertTitle>
                            <AlertDescription>
                              Your Solturio blockchain registration (dated {new Date(selectedLogo.createdAt!).toLocaleDateString()}) provides timestamped prior art evidence but is not itself a USPTO specimen. You still need evidence of actual commercial use.
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 6: Applicant Info */}
              {wizardStep === 6 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 6: Applicant Information</CardTitle>
                    <CardDescription>
                      Enter the legal owner of the trademark. This must match your TEAS application exactly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="applicant-name">Legal Name of Applicant *</Label>
                        <Input
                          id="applicant-name"
                          data-testid="input-applicant-name"
                          placeholder={user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Full legal name or company name"}
                          value={wizardData.applicantName}
                          onChange={(e) => {
                            updateWizard({ applicantName: e.target.value });
                            if (applicantTouched.applicantName) {
                              setApplicantErrors(validateApplicantInfo({ ...wizardData, applicantName: e.target.value }));
                            }
                          }}
                          onBlur={() => handleApplicantBlur("applicantName")}
                        />
                        {applicantTouched.applicantName && applicantErrors.applicantName && (
                          <p className="text-sm text-destructive">{applicantErrors.applicantName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="entity-type">Entity Type *</Label>
                        <Select value={wizardData.entityType} onValueChange={(v: any) => updateWizard({ entityType: v })}>
                          <SelectTrigger id="entity-type" data-testid="select-entity-type">
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="corporation">Corporation</SelectItem>
                            <SelectItem value="llc">LLC</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="citizenship">
                          {wizardData.entityType === "individual" ? "Citizenship/Nationality" : "State/Country of Incorporation"}
                        </Label>
                        <Input
                          id="citizenship"
                          data-testid="input-citizenship"
                          placeholder="US"
                          value={wizardData.citizenship}
                          onChange={(e) => updateWizard({ citizenship: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          data-testid="input-address"
                          placeholder="123 Main St"
                          value={wizardData.applicantAddress}
                          onChange={(e) => updateWizard({ applicantAddress: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          data-testid="input-city"
                          placeholder="City"
                          value={wizardData.applicantCity}
                          onChange={(e) => updateWizard({ applicantCity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">
                          State {wizardData.applicantCountry.trim().toUpperCase() === "US" && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          id="state"
                          data-testid="input-state"
                          placeholder="State"
                          value={wizardData.applicantState}
                          onChange={(e) => {
                            updateWizard({ applicantState: e.target.value });
                            if (applicantTouched.applicantState) {
                              setApplicantErrors(validateApplicantInfo({ ...wizardData, applicantState: e.target.value }));
                            }
                          }}
                          onBlur={() => handleApplicantBlur("applicantState")}
                        />
                        {applicantTouched.applicantState && applicantErrors.applicantState && (
                          <p className="text-sm text-destructive">{applicantErrors.applicantState}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">
                          ZIP Code {wizardData.applicantCountry.trim().toUpperCase() === "US" && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          id="zip"
                          data-testid="input-zip"
                          placeholder="12345 or 12345-6789"
                          inputMode="numeric"
                          value={wizardData.applicantZip}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d-]/g, "");
                            updateWizard({ applicantZip: val });
                            if (applicantTouched.applicantZip) {
                              setApplicantErrors(validateApplicantInfo({ ...wizardData, applicantZip: val }));
                            }
                          }}
                          onBlur={() => handleApplicantBlur("applicantZip")}
                        />
                        {applicantTouched.applicantZip && applicantErrors.applicantZip && (
                          <p className="text-sm text-destructive">{applicantErrors.applicantZip}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Select
                          value={wizardData.applicantCountry}
                          onValueChange={(val) => {
                            updateWizard({ applicantCountry: val });
                            if (applicantTouched.applicantCountry) {
                              setApplicantErrors(validateApplicantInfo({ ...wizardData, applicantCountry: val }));
                            }
                          }}
                        >
                          <SelectTrigger id="country" data-testid="input-country" onBlur={() => handleApplicantBlur("applicantCountry")}>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="GB">United Kingdom</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                            <SelectItem value="DE">Germany</SelectItem>
                            <SelectItem value="FR">France</SelectItem>
                            <SelectItem value="JP">Japan</SelectItem>
                            <SelectItem value="CN">China</SelectItem>
                            <SelectItem value="IN">India</SelectItem>
                            <SelectItem value="BR">Brazil</SelectItem>
                            <SelectItem value="MX">Mexico</SelectItem>
                            <SelectItem value="ES">Spain</SelectItem>
                            <SelectItem value="IT">Italy</SelectItem>
                            <SelectItem value="NL">Netherlands</SelectItem>
                            <SelectItem value="SG">Singapore</SelectItem>
                            <SelectItem value="KR">South Korea</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {applicantTouched.applicantCountry && applicantErrors.applicantCountry && (
                          <p className="text-sm text-destructive">{applicantErrors.applicantCountry}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                  disabled={wizardStep === 1}
                  data-testid="button-wizard-back"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                {wizardStep < STEPS.length ? (
                  <Button
                    onClick={() => {
                      if (wizardStep === 6) {
                        const allTouched = { applicantName: true, applicantCountry: true, applicantState: true, applicantZip: true };
                        setApplicantTouched(allTouched);
                        const errs = validateApplicantInfo(wizardData);
                        setApplicantErrors(errs);
                        if (Object.keys(errs).length > 0 || !wizardData.entityType) return;
                      }
                      setWizardStep((s) => s + 1);
                    }}
                    disabled={!canProceedStep(wizardStep)}
                    data-testid="button-wizard-next"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (wizardStep === 6) {
                        const allTouched = { applicantName: true, applicantCountry: true, applicantState: true, applicantZip: true };
                        setApplicantTouched(allTouched);
                        const errs = validateApplicantInfo(wizardData);
                        setApplicantErrors(errs);
                        if (Object.keys(errs).length > 0 || !wizardData.entityType) return;
                      }
                      setWizardComplete(true);
                    }}
                    disabled={!canProceedStep(wizardStep)}
                    data-testid="button-wizard-complete"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Package
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* COMPLETED WIZARD — Summary + Next Steps */
            <div className="space-y-6" ref={summaryRef}>
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Application Package Ready</AlertTitle>
                <AlertDescription>
                  Review your summary below. Download the checklist and bring everything to USPTO TEAS.
                </AlertDescription>
              </Alert>

              <Card data-testid="card-summary">
                <CardHeader>
                  <CardTitle>Application Summary</CardTitle>
                  <CardDescription>Review all details before proceeding to TEAS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="font-semibold text-muted-foreground uppercase text-xs">Mark</p>
                      <p><strong>Type:</strong> {wizardData.markType}</p>
                      <p><strong>Description:</strong> {wizardData.markDescription || "—"}</p>
                      {wizardData.hasColorClaim && <p><strong>Color Claim:</strong> {wizardData.colorClaim}</p>}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-muted-foreground uppercase text-xs">Filing</p>
                      <p><strong>Basis:</strong> {wizardData.filingBasis === "use_in_commerce" ? "Use in Commerce §1(a)" : "Intent to Use §1(b)"}</p>
                      <p><strong>Classes:</strong> {wizardData.selectedClasses.join(", ") || "None"}</p>
                      <p><strong>ID Manual:</strong> {wizardData.useIdManual ? "Yes" : "No"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-muted-foreground uppercase text-xs">Applicant</p>
                      <p><strong>Name:</strong> {wizardData.applicantName || "—"}</p>
                      <p><strong>Entity:</strong> {wizardData.entityType || "—"}</p>
                      <p><strong>Address:</strong> {[wizardData.applicantAddress, wizardData.applicantCity, wizardData.applicantState, wizardData.applicantZip].filter(Boolean).join(", ") || "—"}</p>
                    </div>
                    {selectedLogo && (
                      <div className="space-y-1">
                        <p className="font-semibold text-muted-foreground uppercase text-xs">Prior Art (Solturio)</p>
                        <p><strong>File:</strong> {selectedLogo.fileName}</p>
                        <p><strong>Registered:</strong> {new Date(selectedLogo.createdAt!).toLocaleDateString()}</p>
                        <p className="font-mono text-xs"><strong>SHA-256:</strong> {selectedLogo.fileHash.slice(0, 20)}...</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Estimated USPTO Filing Fee</p>
                      <p className="text-2xl font-bold">${totalFee.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {numClasses} class(es) × ${totalPerClass}/class
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleDownloadSummary} data-testid="button-download-checklist">
                        <Download className="w-4 h-4 mr-2" />
                        Download Checklist
                      </Button>
                      <Button variant="outline" asChild data-testid="button-goto-teas">
                        <a href="https://teas.uspto.gov" target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Go to TEAS
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Steps on TEAS</CardTitle>
                  <CardDescription>What to bring and do when you visit teas.uspto.gov</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {[
                      { step: "Visit teas.uspto.gov and select 'TEAS Plus' or 'TEAS Standard' (Plus requires ID Manual descriptions and saves $100/class)", cta: null },
                      { step: "Log in or create a USPTO account (myUSPTO)", cta: null },
                      { step: "Upload your mark image file (JPG format, 250+ DPI recommended for design/combined marks)", cta: null },
                      { step: "Select your Nice Classification class(es) and enter goods/services descriptions", cta: null },
                      { step: wizardData.filingBasis === "use_in_commerce" ? "Upload your specimen showing actual use in commerce" : "Declare your bona fide intent to use the mark in commerce", cta: null },
                      { step: "Enter applicant information and sign the declaration", cta: null },
                      { step: "Pay USPTO filing fees by credit card, EFT, or deposit account", cta: null },
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        {item.step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Alert variant="destructive">
                <Scale className="w-4 h-4" />
                <AlertTitle>Legal Disclaimer</AlertTitle>
                <AlertDescription>
                  This checklist and cost estimate are provided for informational purposes only. Solturio is not a law firm and this is not legal advice. Trademark law is complex — filing errors can result in abandonment of your application. We strongly recommend consulting a licensed USPTO trademark attorney before filing.
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                onClick={() => { setWizardComplete(false); setWizardStep(1); setWizardData(DEFAULT_WIZARD_DATA); }}
                data-testid="button-start-over"
              >
                Start Over
              </Button>
            </div>
          )}
        </TabsContent>

        {/* COST ESTIMATOR TAB */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                USPTO Fee Estimator
              </CardTitle>
              <CardDescription>
                Post-January 2025 USPTO fee structure. Fees are per class of goods/services.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CostEstimator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CostEstimator() {
  const [numClasses, setNumClasses] = useState(1);
  const [useIdManual, setUseIdManual] = useState(true);
  const [missingInfo, setMissingInfo] = useState(false);
  const [filingForm, setFilingForm] = useState<"teas_plus" | "teas_standard">("teas_plus");

  const baseFee = filingForm === "teas_plus" ? 250 : 350;
  const freeFormSurcharge = useIdManual ? 0 : 200;
  const missingInfoSurcharge = missingInfo ? 100 : 0;
  const perClassFee = baseFee + freeFormSurcharge + missingInfoSurcharge;
  const totalFee = numClasses * perClassFee;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filing-form">Filing Form</Label>
            <Select value={filingForm} onValueChange={(v: any) => setFilingForm(v)}>
              <SelectTrigger id="filing-form" data-testid="select-filing-form">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teas_plus">TEAS Plus — $250/class (requires ID Manual)</SelectItem>
                <SelectItem value="teas_standard">TEAS Standard — $350/class</SelectItem>
              </SelectContent>
            </Select>
            {filingForm === "teas_plus" && (
              <p className="text-xs text-muted-foreground">
                TEAS Plus requires ID Manual descriptions for all goods/services. Cannot use free-form descriptions.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="num-classes">Number of Classes</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNumClasses((n) => Math.max(1, n - 1))}
                data-testid="button-decrease-classes"
              >
                -
              </Button>
              <span className="w-8 text-center font-semibold" data-testid="text-num-classes">{numClasses}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNumClasses((n) => Math.min(45, n + 1))}
                data-testid="button-increase-classes"
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useIdManual}
                onChange={(e) => setUseIdManual(e.target.checked)}
                disabled={filingForm === "teas_plus"}
                data-testid="checkbox-estimator-id-manual"
              />
              <span className="text-sm">
                Using USPTO ID Manual descriptions
                {filingForm === "teas_plus" && " (required for TEAS Plus)"}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={missingInfo}
                onChange={(e) => setMissingInfo(e.target.checked)}
                data-testid="checkbox-missing-info"
              />
              <span className="text-sm">Application has missing required information (+$100/class surcharge)</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-md p-4 space-y-3 bg-muted/30">
            <h3 className="font-semibold">Fee Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base filing fee ({filingForm === "teas_plus" ? "TEAS Plus" : "TEAS Standard"})</span>
                <span className="font-medium">${baseFee}/class</span>
              </div>
              {!useIdManual && filingForm !== "teas_plus" && (
                <div className="flex justify-between text-destructive">
                  <span>Free-form description surcharge</span>
                  <span>+${freeFormSurcharge}/class</span>
                </div>
              )}
              {missingInfo && (
                <div className="flex justify-between text-destructive">
                  <span>Missing information surcharge</span>
                  <span>+${missingInfoSurcharge}/class</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Per class total</span>
                <span>${perClassFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Number of classes</span>
                <span>× {numClasses}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Estimated Fee</span>
                <span data-testid="text-total-fee">${totalFee.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertTitle>Fee Structure (Post-Jan 2025)</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              <p>• TEAS Plus: $250/class — requires ID Manual descriptions and complete application</p>
              <p>• TEAS Standard: $350/class — allows free-form descriptions</p>
              <p>• Free-form surcharge: +$200/class (TEAS Standard only)</p>
              <p>• Missing info surcharge: +$100/class</p>
              <p>• These are government fees only; attorney fees are separate.</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

function generateTextSummary(
  data: WizardData,
  logo: Logo | undefined,
  totalFee: number,
  user: any
): string {
  const now = new Date().toLocaleString();
  return `SOLTURIO — TRADEMARK APPLICATION CHECKLIST
Generated: ${now}
DISCLAIMER: Solturio is not a law firm. This is not legal advice. Consult a licensed trademark attorney before filing.
==========================================================================

MARK INFORMATION
----------------
Mark Type: ${data.markType || "Not specified"}
Mark Description: ${data.markDescription || "Not specified"}
${data.hasColorClaim ? `Color Claim: ${data.colorClaim}` : "Color Claim: None"}

GOODS & SERVICES
-----------------
Nice Classes: ${data.selectedClasses.join(", ") || "None selected"}
Using ID Manual Descriptions: ${data.useIdManual ? "Yes (recommended)" : "No (+$200/class surcharge)"}
${data.selectedClasses.map((code) => {
  const cls = NICE_CLASSES.find((c) => c.code === code);
  return `\nClass ${code} (${cls?.label?.split(" — ")[1] || ""}):\n  ${data.goodsServicesDescriptions[code] || "No description entered"}`;
}).join("")}

FILING BASIS
-------------
Basis: ${data.filingBasis === "use_in_commerce" ? "Use in Commerce §1(a)" : data.filingBasis === "intent_to_use" ? "Intent to Use §1(b)" : "Not specified"}
${data.filingBasis === "use_in_commerce" ? "ACTION REQUIRED: Prepare a specimen showing actual use in commerce." : "ACTION REQUIRED: Statement of Use must be filed after mark is allowed (within 6 months, extendable to 36 months)."}

APPLICANT INFORMATION
----------------------
Legal Name: ${data.applicantName || "Not entered"}
Entity Type: ${data.entityType || "Not entered"}
Citizenship/Incorporation: ${data.citizenship || "Not entered"}
Address: ${[data.applicantAddress, data.applicantCity, data.applicantState, data.applicantZip, data.applicantCountry].filter(Boolean).join(", ") || "Not entered"}

${logo ? `PRIOR ART (SOLTURIO BLOCKCHAIN REGISTRATION)
----------------------------------------------
File: ${logo.fileName}
Registration Date: ${new Date(logo.createdAt!).toLocaleDateString()}
SHA-256 Hash: ${logo.fileHash}
Note: This blockchain registration can serve as prior art evidence but is not itself a USPTO specimen.

` : ""}ESTIMATED USPTO FILING FEES
----------------------------
Classes: ${Math.max(data.selectedClasses.length, 1)}
Total Estimated Fee: $${totalFee.toLocaleString()}
(Government fees only. Attorney fees are additional.)

CHECKLIST — BRING TO TEAS (teas.uspto.gov)
------------------------------------------
[ ] Mark image file (JPG, 250+ DPI for design marks)
[ ] Goods/services descriptions (ID Manual recommended)
[ ] Specimen (if Use in Commerce basis)
[ ] Applicant legal name, address, entity type
[ ] Citizenship or state/country of incorporation
[ ] Payment method (credit card, EFT, or deposit account)
[ ] USPTO account (myUSPTO)

DIRECT LINK TO TEAS: https://teas.uspto.gov

==========================================================================
DISCLAIMER: This checklist is for informational purposes only. Solturio is not a law firm and this is not legal advice. Trademark law is complex—filing errors can result in abandonment of your application. We strongly recommend consulting a licensed USPTO trademark attorney before filing.
`;
}

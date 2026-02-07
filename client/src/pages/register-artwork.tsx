import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, uploadFormData } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Palette, Upload, ArrowLeft, ArrowRight, Loader2, CheckCircle2, Music, BookOpen, Code, PenTool, FileText } from "lucide-react";

const CREATIVE_WORK_TYPES = [
  { id: "artwork", label: "Artwork / Logo / Design", description: "illustrations, logos, graphic designs, digital art", icon: Palette },
  { id: "audio", label: "Audio / Music", description: "songs, sound effects, podcasts, beats", icon: Music },
  { id: "book", label: "Books / Written Works", description: "manuscripts, whitepapers, articles, research papers", icon: BookOpen },
  { id: "code", label: "Source Code / Software", description: "algorithms, smart contracts, applications", icon: Code },
  { id: "drawing", label: "Drawings / Blueprints", description: "technical drawings, CAD files, schematics", icon: PenTool },
  { id: "plan", label: "Plans / Documents", description: "business plans, whitepapers, pitch decks, specs", icon: FileText },
] as const;

const FILE_ACCEPT_FORMATS: Record<string, string> = {
  artwork: "image/png,image/jpeg,image/svg+xml,image/gif,image/webp",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/flac",
  book: "application/pdf,text/plain,application/epub+zip",
  code: "text/plain,application/zip,application/gzip",
  drawing: "image/png,image/jpeg,image/svg+xml,application/pdf",
  plan: "application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const FILE_FORMAT_DESCRIPTIONS: Record<string, string> = {
  artwork: "PNG, JPG, SVG, GIF, or WebP format",
  audio: "MP3, WAV, OGG, or FLAC format",
  book: "PDF, TXT, or EPUB format",
  code: "TXT, ZIP, or GZIP format",
  drawing: "PNG, JPG, SVG, or PDF format",
  plan: "PDF, TXT, or DOCX format",
};

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  artwork: "Artwork / Logo / Design",
  audio: "Audio / Music",
  book: "Books / Written Works",
  code: "Source Code / Software",
  drawing: "Drawings / Blueprints",
  plan: "Plans / Documents",
};

const TYPES_WITH_CONTRACT_BONDING = ["artwork", "book", "drawing", "plan"];
const IMAGE_PREVIEW_TYPES = ["artwork", "drawing"];

const artworkSchema = z.object({
  creativeWorkType: z.enum(["artwork", "audio", "book", "code", "drawing", "plan"]),

  file: z.any().refine((files) => files?.length > 0, "Please upload your file"),

  artworkTitle: z.string().min(2, "Title must be at least 2 characters").max(200),

  artworkSummary: z.string().min(10, "Summary must be at least 10 characters").max(300, "Summary must be 300 characters or less"),

  whenCreated: z.string().min(1, "Please specify when this was created"),

  createdBy: z.enum(["self", "work_for_hire", "team"], { required_error: "Please specify who created this" }),
  creatorDetails: z.string().optional(),

  isWorkForHire: z.boolean(),
  receivedPayment: z.boolean().optional(),
  paymentAmount: z.string().optional(),
  paymentDetails: z.string().optional(),

  workFor: z.enum(["individual", "community"], { required_error: "Please specify if this is for individual or community" }),

  bondedToContract: z.boolean(),
  contractAddress: z.string().optional(),

  isExclusive: z.boolean(),
  variationsPlanned: z.string().optional(),

  planToLicense: z.boolean(),
  licenseType: z.enum(["limited", "revocable", "perpetuity"], { required_error: "Required if licensing" }).optional(),
  licensingDetails: z.string().optional(),

  planToMintNFT: z.boolean(),
  planToSellVariations: z.boolean(),
  planToGiveAwayVariations: z.boolean(),

  isCustomPFP: z.boolean(),
  pfpClientTelegram: z.string().optional(),
  pfpClientTwitter: z.string().optional(),

  intendedUse: z.string().min(20, "Please describe intended use (minimum 20 characters)"),

  portfolioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  twitterHandle: z.string().optional(),
  telegramHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  discordHandle: z.string().optional(),
  otherSocial: z.string().optional(),

  audioGenre: z.string().optional(),
  audioDuration: z.string().optional(),
  audioContainsSamples: z.boolean().optional(),
  audioSampleDetails: z.string().optional(),
  audioHasVocals: z.enum(["instrumental", "vocals", "both"]).optional(),

  bookCategory: z.string().optional(),
  bookWordCount: z.string().optional(),
  bookLanguage: z.string().optional(),
  bookCoAuthors: z.string().optional(),
  bookIsbn: z.string().optional(),

  codeProgrammingLanguage: z.string().optional(),
  codeRepoUrl: z.string().optional(),
  codeLicenseType: z.string().optional(),
  codeVersion: z.string().optional(),

  drawingScale: z.string().optional(),
  drawingStandard: z.string().optional(),

  planDocumentType: z.string().optional(),
  planConfidentiality: z.string().optional(),
  planVersion: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isWorkForHire && data.createdBy !== "work_for_hire") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "If this is work for hire, please select 'Work for hire' as the creator",
      path: ["createdBy"],
    });
  }

  if (data.createdBy === "work_for_hire" && !data.isWorkForHire) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "If created by work for hire, must check work for hire checkbox",
      path: ["isWorkForHire"],
    });
  }

  if (data.isWorkForHire && (!data.paymentAmount || data.paymentAmount.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment amount is required for work for hire",
      path: ["paymentAmount"],
    });
  }

  if (data.isWorkForHire && (!data.paymentDetails || data.paymentDetails.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide payment and contract details for work for hire",
      path: ["paymentDetails"],
    });
  }

  if ((data.createdBy === "work_for_hire" || data.createdBy === "team") && (!data.creatorDetails || data.creatorDetails.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide details about who created this work",
      path: ["creatorDetails"],
    });
  }

  if (data.bondedToContract && (!data.contractAddress || data.contractAddress.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide the contract address",
      path: ["contractAddress"],
    });
  }

  if (!data.isExclusive && (!data.variationsPlanned || data.variationsPlanned.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please describe the variations (since this is not exclusive 1 of 1)",
      path: ["variationsPlanned"],
    });
  }

  if (data.planToLicense && !data.licenseType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the license type",
      path: ["licenseType"],
    });
  }

  if (data.planToLicense && (!data.licensingDetails || data.licensingDetails.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide licensing details and terms",
      path: ["licensingDetails"],
    });
  }

  if (data.isCustomPFP) {
    if (!data.pfpClientTwitter || data.pfpClientTwitter.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide client's Twitter handle",
        path: ["pfpClientTwitter"],
      });
    }
    if (!data.pfpClientTelegram || data.pfpClientTelegram.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide client's Telegram handle",
        path: ["pfpClientTelegram"],
      });
    }
  }

  if (data.creativeWorkType === "audio" && data.audioContainsSamples && (!data.audioSampleDetails || data.audioSampleDetails.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide sample clearance details",
      path: ["audioSampleDetails"],
    });
  }
});

type ArtworkFormValues = z.infer<typeof artworkSchema>;

const getStepFields = (creativeWorkType: string) => {
  const step1Base = ["file", "artworkTitle", "artworkSummary", "whenCreated", "creativeWorkType"];

  const typeSpecificStep1: Record<string, string[]> = {
    audio: ["audioGenre", "audioDuration", "audioContainsSamples", "audioSampleDetails", "audioHasVocals"],
    book: ["bookCategory", "bookWordCount", "bookLanguage", "bookCoAuthors", "bookIsbn"],
    code: ["codeProgrammingLanguage", "codeRepoUrl", "codeLicenseType", "codeVersion"],
    drawing: ["drawingScale", "drawingStandard"],
    plan: ["planDocumentType", "planConfidentiality", "planVersion"],
  };

  return {
    1: [...step1Base, ...(typeSpecificStep1[creativeWorkType] || [])] as string[],
    2: ["createdBy", "creatorDetails", "isWorkForHire", "receivedPayment", "paymentAmount", "paymentDetails", "workFor"] as string[],
    3: ["isExclusive", "variationsPlanned", "planToSellVariations", "planToGiveAwayVariations", "planToLicense", "licenseType", "licensingDetails", "isCustomPFP", "pfpClientTwitter", "pfpClientTelegram"] as string[],
    4: ["planToMintNFT", "bondedToContract", "contractAddress", "intendedUse", "portfolioUrl", "twitterHandle", "telegramHandle", "instagramHandle", "discordHandle", "otherSocial"] as string[],
  };
};

export default function RegisterArtwork() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const form = useForm<ArtworkFormValues>({
    resolver: zodResolver(artworkSchema),
    mode: "onChange",
    defaultValues: {
      creativeWorkType: "artwork",
      createdBy: "self",
      workFor: "individual",
      isWorkForHire: false,
      isExclusive: true,
      planToLicense: false,
      planToMintNFT: false,
      planToSellVariations: false,
      planToGiveAwayVariations: false,
      isCustomPFP: false,
      bondedToContract: false,
      audioContainsSamples: false,
    },
  });

  const creativeWorkType = form.watch("creativeWorkType");
  const creativeTypeLabel = CREATIVE_TYPE_LABELS[creativeWorkType] || "Creative Work";

  useEffect(() => {
    document.title = `Creative Work Registration - Solturio`;
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register artwork.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await uploadFormData("/api/logos/upload-artwork", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logos"] });
      toast({
        title: "Creative Work Registered Successfully!",
        description: "Your work has been registered with blockchain-verified proof of ownership.",
      });
      setLocation(`/dashboard`);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ArtworkFormValues) => {
    const formData = new FormData();

    if (values.file?.[0]) {
      formData.append("file", values.file[0]);
    }

    const baseData: Record<string, any> = {
      creativeWorkType: values.creativeWorkType,
      artworkSummary: values.artworkSummary,
      createdBy: values.createdBy,
      creatorDetails: values.creatorDetails || null,
      whenCreated: values.whenCreated,
      workFor: values.workFor,
      isWorkForHire: values.isWorkForHire,
      receivedPayment: values.receivedPayment || null,
      paymentAmount: values.paymentAmount || null,
      paymentDetails: values.paymentDetails || null,
      isExclusive: values.isExclusive,
      variationsPlanned: values.variationsPlanned || null,
      planToLicense: values.planToLicense,
      licenseType: values.licenseType || null,
      licensingDetails: values.licensingDetails || null,
      planToMintNFT: values.planToMintNFT,
      planToSellVariations: values.planToSellVariations,
      planToGiveAwayVariations: values.planToGiveAwayVariations,
      portfolioUrl: values.portfolioUrl || null,
      twitterHandle: values.twitterHandle || null,
      telegramHandle: values.telegramHandle || null,
      instagramHandle: values.instagramHandle || null,
      discordHandle: values.discordHandle || null,
      otherSocial: values.otherSocial || null,
    };

    if (TYPES_WITH_CONTRACT_BONDING.includes(values.creativeWorkType)) {
      baseData.bondedToContract = values.bondedToContract;
      baseData.contractAddress = values.contractAddress || null;
    }

    if (values.creativeWorkType === "artwork") {
      baseData.isCustomPFP = values.isCustomPFP;
      baseData.pfpClientTelegram = values.pfpClientTelegram || null;
      baseData.pfpClientTwitter = values.pfpClientTwitter || null;
    }

    if (values.creativeWorkType === "audio") {
      baseData.audioGenre = values.audioGenre || null;
      baseData.audioDuration = values.audioDuration || null;
      baseData.audioContainsSamples = values.audioContainsSamples || false;
      baseData.audioSampleDetails = values.audioSampleDetails || null;
      baseData.audioHasVocals = values.audioHasVocals || null;
    }

    if (values.creativeWorkType === "book") {
      baseData.bookCategory = values.bookCategory || null;
      baseData.bookWordCount = values.bookWordCount || null;
      baseData.bookLanguage = values.bookLanguage || null;
      baseData.bookCoAuthors = values.bookCoAuthors || null;
      baseData.bookIsbn = values.bookIsbn || null;
    }

    if (values.creativeWorkType === "code") {
      baseData.codeProgrammingLanguage = values.codeProgrammingLanguage || null;
      baseData.codeRepoUrl = values.codeRepoUrl || null;
      baseData.codeLicenseType = values.codeLicenseType || null;
      baseData.codeVersion = values.codeVersion || null;
    }

    if (values.creativeWorkType === "drawing") {
      baseData.drawingScale = values.drawingScale || null;
      baseData.drawingStandard = values.drawingStandard || null;
    }

    if (values.creativeWorkType === "plan") {
      baseData.planDocumentType = values.planDocumentType || null;
      baseData.planConfidentiality = values.planConfidentiality || null;
      baseData.planVersion = values.planVersion || null;
    }

    formData.append("registrationData", JSON.stringify(baseData));
    formData.append("description", `${values.artworkTitle}: ${values.artworkSummary}`);
    formData.append("intendedUse", values.intendedUse);

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (IMAGE_PREVIEW_TYPES.includes(creativeWorkType) && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleNext = async () => {
    const stepFields = getStepFields(creativeWorkType);
    const fieldsToValidate = stepFields[currentStep as keyof typeof stepFields];
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast({
        title: "Please complete all required fields",
        description: "Review the errors above before continuing.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createdBy = form.watch("createdBy");
  const isWorkForHire = form.watch("isWorkForHire");
  const isExclusive = form.watch("isExclusive");
  const bondedToContract = form.watch("bondedToContract");
  const planToLicense = form.watch("planToLicense");
  const isCustomPFP = form.watch("isCustomPFP");
  const audioContainsSamples = form.watch("audioContainsSamples");

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const progressPercentage = (currentStep / totalSteps) * 100;
  const selectedTypeInfo = CREATIVE_WORK_TYPES.find(t => t.id === creativeWorkType);
  const SelectedIcon = selectedTypeInfo?.icon || Palette;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/register")}
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Registration
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <SelectedIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Creative Work Registration</CardTitle>
              <CardDescription>
                {creativeTypeLabel} &mdash; Step {currentStep} of {totalSteps}
              </CardDescription>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Progress value={progressPercentage} className="h-2" data-testid="progress-wizard" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={currentStep === 1 ? "font-semibold text-foreground" : ""}>Upload & Details</span>
              <span className={currentStep === 2 ? "font-semibold text-foreground" : ""}>Ownership</span>
              <span className={currentStep === 3 ? "font-semibold text-foreground" : ""}>Licensing</span>
              <span className={currentStep === 4 ? "font-semibold text-foreground" : ""}>Distribution</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload & Details</CardTitle>
                <CardDescription>
                  Select the type of creative work, upload your file, and provide basic details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="creativeWorkType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Type of Creative Work *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(val) => {
                            field.onChange(val);
                            setFilePreview(null);
                            setFileName(null);
                            form.setValue("file", undefined);
                          }}
                          value={field.value}
                          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                          data-testid="radio-creative-work-type"
                        >
                          {CREATIVE_WORK_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isSelected = field.value === type.id;
                            return (
                              <div key={type.id} className="relative">
                                <RadioGroupItem value={type.id} id={`type-${type.id}`} className="sr-only" />
                                <Label
                                  htmlFor={`type-${type.id}`}
                                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors text-center ${
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-muted hover-elevate"
                                  }`}
                                  data-testid={`radio-type-${type.id}`}
                                >
                                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                  <span className={`text-xs font-medium leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                                    {type.label}
                                  </span>
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>File *</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input
                            type="file"
                            accept={FILE_ACCEPT_FORMATS[creativeWorkType]}
                            onChange={(e) => {
                              onChange(e.target.files);
                              handleFileChange(e);
                            }}
                            {...field}
                            data-testid="input-file-upload"
                          />
                          {IMAGE_PREVIEW_TYPES.includes(creativeWorkType) && filePreview && (
                            <div className="flex justify-center">
                              <img
                                src={filePreview}
                                alt="Preview"
                                className="max-w-xs max-h-64 rounded border"
                                data-testid="img-file-preview"
                              />
                            </div>
                          )}
                          {!IMAGE_PREVIEW_TYPES.includes(creativeWorkType) && fileName && (
                            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50" data-testid="text-file-name">
                              <SelectedIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{fileName}</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>{FILE_FORMAT_DESCRIPTIONS[creativeWorkType]}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artworkTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Cyber Dragon Logo" {...field} data-testid="input-artwork-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artworkSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brief Summary *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quick description (max 300 characters)..."
                          rows={3}
                          maxLength={300}
                          {...field}
                          data-testid="textarea-artwork-summary"
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/300 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whenCreated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When was this created? *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-when-created" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {creativeWorkType === "audio" && (
                  <>
                    <Separator />
                    <h3 className="font-semibold text-sm">Audio Details</h3>

                    <FormField
                      control={form.control}
                      name="audioGenre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genre / Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-audio-genre">
                                <SelectValue placeholder="Select genre" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="music">Music</SelectItem>
                              <SelectItem value="sound_effect">Sound Effect</SelectItem>
                              <SelectItem value="podcast">Podcast</SelectItem>
                              <SelectItem value="voice_recording">Voice Recording</SelectItem>
                              <SelectItem value="beat">Beat</SelectItem>
                              <SelectItem value="composition">Composition</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="audioDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 3:45" {...field} data-testid="input-audio-duration" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="audioContainsSamples"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-audio-contains-samples"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Contains samples from other works?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {audioContainsSamples && (
                      <FormField
                        control={form.control}
                        name="audioSampleDetails"
                        render={({ field }) => (
                          <FormItem className="ml-6">
                            <FormLabel>Sample Clearance Details *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe samples used and clearance status..."
                                rows={3}
                                {...field}
                                data-testid="textarea-audio-sample-details"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="audioHasVocals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vocal Content</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              className="flex flex-col space-y-2"
                              data-testid="radio-audio-has-vocals"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="instrumental" id="vocals-instrumental" />
                                <Label htmlFor="vocals-instrumental" className="font-normal cursor-pointer">Instrumental</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="vocals" id="vocals-vocals" />
                                <Label htmlFor="vocals-vocals" className="font-normal cursor-pointer">Vocals</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="both" id="vocals-both" />
                                <Label htmlFor="vocals-both" className="font-normal cursor-pointer">Both</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {creativeWorkType === "book" && (
                  <>
                    <Separator />
                    <h3 className="font-semibold text-sm">Book Details</h3>

                    <FormField
                      control={form.control}
                      name="bookCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-book-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="novel">Novel</SelectItem>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="whitepaper">Whitepaper</SelectItem>
                              <SelectItem value="research_paper">Research Paper</SelectItem>
                              <SelectItem value="poetry">Poetry</SelectItem>
                              <SelectItem value="script">Script</SelectItem>
                              <SelectItem value="manuscript">Manuscript</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bookWordCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approximate Word/Page Count</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 50,000 words" {...field} data-testid="input-book-word-count" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bookLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., English" {...field} data-testid="input-book-language" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bookCoAuthors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Co-authors (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="List co-authors if any..."
                              rows={2}
                              {...field}
                              data-testid="textarea-book-co-authors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bookIsbn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ISBN (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 978-3-16-148410-0" {...field} data-testid="input-book-isbn" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {creativeWorkType === "code" && (
                  <>
                    <Separator />
                    <h3 className="font-semibold text-sm">Code Details</h3>

                    <FormField
                      control={form.control}
                      name="codeProgrammingLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Programming Language(s)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Rust, TypeScript" {...field} data-testid="input-code-programming-language" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="codeRepoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repository URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/..." {...field} data-testid="input-code-repo-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="codeLicenseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-code-license-type">
                                <SelectValue placeholder="Select license" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mit">MIT</SelectItem>
                              <SelectItem value="apache_2">Apache 2.0</SelectItem>
                              <SelectItem value="gpl_3">GPL 3.0</SelectItem>
                              <SelectItem value="bsd">BSD</SelectItem>
                              <SelectItem value="proprietary">Proprietary</SelectItem>
                              <SelectItem value="unlicensed">Unlicensed</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="codeVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1.0.0" {...field} data-testid="input-code-version" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {creativeWorkType === "drawing" && (
                  <>
                    <Separator />
                    <h3 className="font-semibold text-sm">Drawing Details</h3>

                    <FormField
                      control={form.control}
                      name="drawingScale"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scale / Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1:100 or 24x36 inches" {...field} data-testid="input-drawing-scale" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drawingStandard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Technical Standard (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ISO 128, ANSI Y14.5" {...field} data-testid="input-drawing-standard" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {creativeWorkType === "plan" && (
                  <>
                    <Separator />
                    <h3 className="font-semibold text-sm">Document Details</h3>

                    <FormField
                      control={form.control}
                      name="planDocumentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-plan-document-type">
                                <SelectValue placeholder="Select document type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="whitepaper">Whitepaper</SelectItem>
                              <SelectItem value="business_plan">Business Plan</SelectItem>
                              <SelectItem value="pitch_deck">Pitch Deck</SelectItem>
                              <SelectItem value="technical_spec">Technical Specification</SelectItem>
                              <SelectItem value="proposal">Proposal</SelectItem>
                              <SelectItem value="report">Report</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="planConfidentiality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confidentiality Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-plan-confidentiality">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="confidential">Confidential</SelectItem>
                              <SelectItem value="restricted">Restricted</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="planVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., v1.0" {...field} data-testid="input-plan-version" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Ownership & Agreements</CardTitle>
                <CardDescription>
                  Legal questions about creation and ownership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <FormField
                  control={form.control}
                  name="createdBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">1. Who created this work? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="self" id="created-self" data-testid="radio-created-self" />
                            <Label htmlFor="created-self" className="font-normal cursor-pointer">
                              I created it myself
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="work_for_hire" id="created-hire" data-testid="radio-created-hire" />
                            <Label htmlFor="created-hire" className="font-normal cursor-pointer">
                              Work for hire (I hired/commissioned someone)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="team" id="created-team" data-testid="radio-created-team" />
                            <Label htmlFor="created-team" className="font-normal cursor-pointer">
                              Created by my team/company
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(createdBy === "work_for_hire" || createdBy === "team") && (
                  <FormField
                    control={form.control}
                    name="creatorDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provide details about who created this *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., Hired designer John Doe, signed rights transfer agreement..."
                            rows={3}
                            {...field}
                            data-testid="textarea-creator-details"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                <FormField
                  control={form.control}
                  name="isWorkForHire"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-work-for-hire"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold">
                          2. Is this work for hire?
                        </FormLabel>
                        <FormDescription>
                          Check if you created this for a client who owns the rights
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {isWorkForHire && (
                  <>
                    <FormField
                      control={form.control}
                      name="receivedPayment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-received-payment"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Did you receive payment for this work?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentAmount"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>Payment Amount *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., $500 USD or 2 SOL"
                              {...field}
                              data-testid="input-payment-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentDetails"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>Payment and Contract Details *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide payment details, contract information, dates..."
                              rows={3}
                              {...field}
                              data-testid="textarea-payment-details"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Separator />

                <FormField
                  control={form.control}
                  name="workFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">3. Is this work for an individual or community? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individual" id="work-individual" data-testid="radio-work-individual" />
                            <Label htmlFor="work-individual" className="font-normal cursor-pointer">
                              Individual (personal project, client work)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="community" id="work-community" data-testid="radio-work-community" />
                            <Label htmlFor="work-community" className="font-normal cursor-pointer">
                              Community (DAO, collective, open-source project)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Licensing & Exclusivity</CardTitle>
                <CardDescription>
                  Define usage rights and distribution plans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <FormField
                  control={form.control}
                  name="isExclusive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-exclusive"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold">
                          4. Is this work exclusive (1 of 1)?
                        </FormLabel>
                        <FormDescription>
                          Check if this is a unique piece with no variations
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {!isExclusive && (
                  <FormField
                    control={form.control}
                    name="variationsPlanned"
                    render={({ field }) => (
                      <FormItem className="ml-6">
                        <FormLabel>Describe the variations *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., Color variations, size variations, alternative backgrounds..."
                            rows={3}
                            {...field}
                            data-testid="textarea-variations-planned"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                {(creativeWorkType === "artwork" || creativeWorkType === "audio") && (
                  <>
                    <FormField
                      control={form.control}
                      name="planToSellVariations"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-sell-variations"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-semibold">
                              5. Will you sell variations{creativeWorkType === "audio" ? " / remixes" : ""} of this work?
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="planToGiveAwayVariations"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-giveaway-variations"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-semibold">
                              6. Will you give away variations{creativeWorkType === "audio" ? " / remixes" : ""} of this work?
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Separator />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="planToLicense"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-plan-to-license"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold">
                          7. Do you plan to license this work to others?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {planToLicense && (
                  <>
                    <FormField
                      control={form.control}
                      name="licenseType"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>License Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-license-type">
                                <SelectValue placeholder="Select license type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="limited">Limited (time-bound or usage-restricted)</SelectItem>
                              <SelectItem value="revocable">Revocable (can be cancelled)</SelectItem>
                              <SelectItem value="perpetuity">Perpetuity (permanent, irrevocable)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="licensingDetails"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>Licensing Details and Terms *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your licensing plans, pricing, restrictions..."
                              rows={3}
                              {...field}
                              data-testid="textarea-licensing-details"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {creativeWorkType === "artwork" && (
                  <>
                    <Separator />

                    <FormField
                      control={form.control}
                      name="isCustomPFP"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-custom-pfp"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-semibold">
                              8. Is this a customized PFP for someone specific?
                            </FormLabel>
                            <FormDescription>
                              Check if this is a profile picture created for a specific person/project
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {isCustomPFP && (
                      <>
                        <FormField
                          control={form.control}
                          name="pfpClientTwitter"
                          render={({ field }) => (
                            <FormItem className="ml-6">
                              <FormLabel>Client's Twitter/X Handle *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="@username"
                                  {...field}
                                  data-testid="input-pfp-client-twitter"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pfpClientTelegram"
                          render={({ field }) => (
                            <FormItem className="ml-6">
                              <FormLabel>Client's Telegram Handle *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="@username"
                                  {...field}
                                  data-testid="input-pfp-client-telegram"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Distribution & Social Proof</CardTitle>
                <CardDescription>
                  NFT plans, contract bonding, and social media verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <FormField
                  control={form.control}
                  name="planToMintNFT"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-plan-to-mint-nft"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold">
                          9. Do you plan to mint this as an NFT?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {TYPES_WITH_CONTRACT_BONDING.includes(creativeWorkType) && (
                  <>
                    <Separator />

                    <FormField
                      control={form.control}
                      name="bondedToContract"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-bonded-to-contract"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-semibold">
                              10. Will this work be bonded to a specific contract address?
                            </FormLabel>
                            <FormDescription>
                              Check if this work will be tied to a specific smart contract (NFT collection, token, etc.)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {bondedToContract && (
                      <FormField
                        control={form.control}
                        name="contractAddress"
                        render={({ field }) => (
                          <FormItem className="ml-6">
                            <FormLabel>Contract Address *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 0x... or Solana address"
                                {...field}
                                data-testid="input-contract-address"
                              />
                            </FormControl>
                            <FormDescription>The blockchain contract address this work will be bonded to</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                <Separator />

                <FormField
                  control={form.control}
                  name="intendedUse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">11. How will you use this work? *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Portfolio display, client projects, merchandise, social media branding, NFT marketplace..."
                          rows={4}
                          {...field}
                          data-testid="textarea-intended-use"
                        />
                      </FormControl>
                      <FormDescription>
                        List all planned uses (minimum 20 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Your Social Media Presence</h3>
                  <p className="text-sm text-muted-foreground">
                    Provide your social media accounts for verification
                  </p>

                  <FormField
                    control={form.control}
                    name="portfolioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portfolio or Website URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://yourportfolio.com"
                            {...field}
                            data-testid="input-portfolio-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitterHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter/X Handle</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@yourusername"
                            {...field}
                            data-testid="input-twitter-handle"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telegramHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telegram Handle</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@yourusername"
                            {...field}
                            data-testid="input-telegram-handle"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagramHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram Handle</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@yourusername"
                            {...field}
                            data-testid="input-instagram-handle"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discordHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discord Handle</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="username#1234"
                            {...field}
                            data-testid="input-discord-handle"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otherSocial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Social Media</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List any other social media accounts"
                            rows={2}
                            {...field}
                            data-testid="textarea-other-social"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                data-testid="button-back-step"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1"
                data-testid="button-next-step"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1"
                disabled={uploadMutation.isPending}
                data-testid="button-submit-artwork-registration"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Registration
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => setLocation("/register")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

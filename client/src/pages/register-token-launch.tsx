import { useEffect, useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Rocket,
  Upload,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Globe,
  Eye,
  EyeOff,
  Plus,
  Link,
  Wallet,
  Info,
} from "lucide-react";
import { SiGithub, SiTelegram, SiDiscord, SiYoutube, SiTiktok, SiX } from "react-icons/si";

// Generate ticker deviations for protection
function generateTickerDeviations(ticker: string): string[] {
  if (!ticker || ticker.length < 2) return [];

  const clean = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const deviations = new Set<string>();

  // Base forms
  deviations.add(clean); // CATH
  deviations.add(`$${clean}`); // $CATH

  // Dotted form: C.A.T.H.
  const dotted = clean.split("").join(".");
  deviations.add(dotted); // C.A.T.H
  deviations.add(`${dotted}.`); // C.A.T.H.
  deviations.add(`$${dotted}`); // $C.A.T.H
  deviations.add(`$${dotted}.`); // $C.A.T.H.

  // Common substitutions
  const substitutions: Record<string, string[]> = {
    A: ["4", "@"],
    E: ["3"],
    I: ["1", "!"],
    O: ["0"],
    S: ["5", "$"],
    T: ["7"],
    B: ["8"],
    G: ["6", "9"],
  };

  // Generate simple substitutions for short tickers
  if (clean.length <= 5) {
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (substitutions[char]) {
        for (const sub of substitutions[char]) {
          const variant = clean.substring(0, i) + sub + clean.substring(i + 1);
          deviations.add(variant);
          deviations.add(`$${variant}`);
        }
      }
    }
  }

  return Array.from(deviations);
}

// Generate token name deviations for protection
function generateNameDeviations(name: string): string[] {
  if (!name || name.length < 2) return [];

  const clean = name.trim();
  const deviations = new Set<string>();

  // Base forms
  deviations.add(clean);
  deviations.add(clean.toLowerCase());
  deviations.add(clean.toUpperCase());

  // Common suffixes
  const suffixes = ["Token", "Coin", "Protocol", "Finance", "Network", "DAO", "Labs", "IO"];
  for (const suffix of suffixes) {
    deviations.add(`${clean} ${suffix}`);
    deviations.add(`${clean}${suffix}`);
    deviations.add(`$${clean}`);
  }

  // With $ prefix
  deviations.add(`$${clean}`);
  deviations.add(`$${clean.toUpperCase()}`);

  // Common prefixes
  const prefixes = ["The", "Official", "Real", "True", "Original"];
  for (const prefix of prefixes) {
    deviations.add(`${prefix} ${clean}`);
  }

  // Typosquatting variations (double letters, missing letters)
  const lowerName = clean.toLowerCase();
  for (let i = 0; i < lowerName.length; i++) {
    // Double letter
    const doubled = lowerName.slice(0, i) + lowerName[i] + lowerName.slice(i);
    deviations.add(doubled);
    deviations.add(doubled.charAt(0).toUpperCase() + doubled.slice(1));

    // Missing letter (only if name is long enough)
    if (lowerName.length > 3) {
      const missing = lowerName.slice(0, i) + lowerName.slice(i + 1);
      deviations.add(missing);
      deviations.add(missing.charAt(0).toUpperCase() + missing.slice(1));
    }
  }

  // Common letter swaps
  const swaps: Record<string, string> = {
    i: "l",
    l: "i",
    o: "0",
    "0": "o",
    e: "3",
    s: "5",
  };
  for (let i = 0; i < lowerName.length; i++) {
    const char = lowerName[i];
    if (swaps[char]) {
      const swapped = lowerName.slice(0, i) + swaps[char] + lowerName.slice(i + 1);
      deviations.add(swapped);
      deviations.add(swapped.charAt(0).toUpperCase() + swapped.slice(1));
    }
  }

  return Array.from(deviations);
}

// Token category definitions with descriptions
const TOKEN_CATEGORIES = {
  meme: {
    label: "Meme Token",
    description: "Community-driven, culture and engagement focused",
    baseSummary: "A community-first meme token designed for culture and engagement.",
  },
  utility: {
    label: "Utility Token",
    description: "Powers access and core actions in a product/protocol",
    baseSummary: "A utility token that powers access and core actions in our product/protocol.",
  },
  rewards: {
    label: "Rewards Token",
    description: "Incentivizes usage, participation, and engagement",
    baseSummary: "A rewards token designed to incentivize usage and participation.",
  },
  governance: {
    label: "Governance Token",
    description: "Used to vote on protocol and treasury decisions",
    baseSummary: "A governance token used to vote on protocol and treasury decisions.",
  },
  payment: {
    label: "Payment Token",
    description: "Used to purchase goods/services within ecosystem",
    baseSummary: "A payment token used to purchase goods/services within our ecosystem.",
  },
  nft_membership: {
    label: "NFT/Membership Token",
    description: "Token-gated access, perks, and membership benefits",
    baseSummary: "A membership asset used for token-gated access and perks.",
  },
  stablecoin: {
    label: "Stablecoin",
    description: "Price-stable token designed to track a defined peg",
    baseSummary: "A price-stable token designed to track a defined peg.",
  },
  lp_vault: {
    label: "LP/Vault Receipt",
    description: "Represents a liquidity or vault position",
    baseSummary: "A receipt token representing a liquidity or vault position.",
  },
  experimental: {
    label: "Experimental/Test",
    description: "For testing, demos, and early iterations",
    baseSummary: "An experimental token for testing, demos, and early iterations.",
  },
  other: {
    label: "Other",
    description: "Custom intent defined by the project team",
    baseSummary: "A token with a custom intent defined by the project team.",
  },
} as const;

// Token uses/tags with their clause mappings
const TOKEN_USES = {
  access: {
    label: "Access / Token-gating",
    clause: "used to unlock features and gated access",
  },
  protocol_fees: {
    label: "Protocol Fees",
    clause: "used to pay protocol or usage fees",
  },
  rewards_emissions: {
    label: "Rewards / Emissions",
    clause: "distributed through rewards, incentives, or airdrops",
  },
  staking: {
    label: "Staking / Bonding",
    clause: "used for staking, bonding, or security participation",
  },
  governance_voting: {
    label: "Governance / Voting",
    clause: "used for governance and voting",
  },
  payments: {
    label: "Payments / Subscriptions",
    clause: "used for payments and subscriptions",
  },
  liquidity: {
    label: "Liquidity / LP Incentives",
    clause: "used to bootstrap or reward liquidity",
  },
  collectibles: {
    label: "Collectibles / Perks",
    clause: "used for collectibles, perks, or membership benefits",
  },
} as const;

type TokenCategory = keyof typeof TOKEN_CATEGORIES;
type TokenUse = keyof typeof TOKEN_USES;

// Generate 1-liner summary based on category and uses
function generateTokenSummary(category: TokenCategory | undefined, uses: TokenUse[]): string {
  if (!category) return "";

  const categoryInfo = TOKEN_CATEGORIES[category];
  let summary = categoryInfo.baseSummary;

  if (uses.length === 0) return summary;

  const useClauses = uses.slice(0, 2).map((use) => TOKEN_USES[use].clause);

  if (category === "meme") {
    summary += ` Utility (if any) includes ${useClauses.join(" and ")}.`;
  } else {
    summary += ` It is ${useClauses.join(", and ")}.`;
  }

  return summary;
}

const tokenLaunchSchema = z
  .object({
    file: z.any().refine((files) => files?.length > 0, "Please upload your token artwork"),

    tokenName: z.string().min(2, "Token name must be at least 2 characters").max(100),
    tokenTicker: z
      .string()
      .min(1, "Ticker is required")
      .max(10, "Ticker must be 10 characters or less")
      .regex(/^[A-Z0-9]+$/, "Ticker must be uppercase letters and numbers only"),
    includeDollarSign: z.boolean().default(true),

    projectSummary: z
      .string()
      .min(10, "Summary must be at least 10 characters")
      .max(1500, "Summary must be 1500 characters or less"),

    launchTimeline: z.string().min(1, "Please select when you will launch"),
    launchPlatform: z.string().min(1, "Please select where you will launch"),

    tokenCategory: z.enum(
      [
        "meme",
        "utility",
        "rewards",
        "governance",
        "payment",
        "nft_membership",
        "stablecoin",
        "lp_vault",
        "experimental",
        "other",
      ],
      { required_error: "Please select token category" }
    ),
    tokenUses: z
      .array(
        z.enum([
          "access",
          "protocol_fees",
          "rewards_emissions",
          "staking",
          "governance_voting",
          "payments",
          "liquidity",
          "collectibles",
        ])
      )
      .max(2, "Select up to 2 uses")
      .default([]),
    generatedSummary: z.string().optional(),

    totalSupply: z.string().min(1, "Please specify total supply"),
    tokenomicsDetails: z.string().min(30, "Please describe tokenomics (minimum 30 characters)"),

    supplyLocked: z.enum(["yes", "no"], {
      required_error: "Please specify if supply will be locked",
    }),
    lockDuration: z.string().optional(),

    authorityWallet: z.string().min(1, "Authority/Dev wallet address is required"),
    additionalWallet1Label: z.string().max(50).optional().or(z.literal("")),
    additionalWallet1Address: z.string().optional().or(z.literal("")),
    additionalWallet2Label: z.string().max(50).optional().or(z.literal("")),
    additionalWallet2Address: z.string().optional().or(z.literal("")),

    twitterHandle: z
      .string()
      .min(1, "Twitter/X handle is required for verification")
      .regex(/^@?[A-Za-z0-9_]+$/, "Invalid Twitter handle"),
    proofPostUrl1: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || /^https?:\/\/(x\.com|twitter\.com)\/.+\/status\/\d+/.test(val),
        "Must be a valid Twitter/X post URL (e.g., https://x.com/username/status/123456)"
      ),
    proofPostUrl2: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || /^https?:\/\/(x\.com|twitter\.com)\/.+\/status\/\d+/.test(val),
        "Must be a valid Twitter/X post URL (e.g., https://x.com/username/status/123456)"
      ),

    websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    telegramUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    discordUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    youtubeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    tiktokUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    extraUrl1Label: z.string().max(50).optional().or(z.literal("")),
    extraUrl1: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    extraUrl2Label: z.string().max(50).optional().or(z.literal("")),
    extraUrl2: z.string().url("Must be a valid URL").optional().or(z.literal("")),

    githubRepoOption: z.enum(["none", "create_new", "link_existing"]).default("none"),
    githubRepoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),

    isPublic: z.boolean().default(true),

    // Optional - Contract Address (can be added post-launch)
    tokenContractAddress: z.string().optional(),
    tokenContractChain: z
      .enum(["solana", "ethereum", "base", "arbitrum", "polygon", "other"])
      .optional(),
    tokenPoolAddress: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.githubRepoOption === "link_existing") {
        return data.githubRepoUrl && data.githubRepoUrl.length > 0;
      }
      return true;
    },
    {
      message: "GitHub repo URL is required when linking an existing repo",
      path: ["githubRepoUrl"],
    }
  )
  .refine(
    (data) => {
      if (data.additionalWallet1Label && data.additionalWallet1Label.trim().length > 0) {
        return data.additionalWallet1Address && data.additionalWallet1Address.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please provide the wallet address",
      path: ["additionalWallet1Address"],
    }
  )
  .refine(
    (data) => {
      if (data.additionalWallet2Label && data.additionalWallet2Label.trim().length > 0) {
        return data.additionalWallet2Address && data.additionalWallet2Address.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please provide the wallet address",
      path: ["additionalWallet2Address"],
    }
  );

type TokenLaunchFormValues = z.infer<typeof tokenLaunchSchema>;

export default function RegisterTokenLaunch() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Token Launch Registration - Solturio";
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register a token.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const form = useForm<TokenLaunchFormValues>({
    resolver: zodResolver(tokenLaunchSchema),
    mode: "onBlur",
    defaultValues: {
      supplyLocked: "no",
      authorityWallet: "",
      additionalWallet1Label: "",
      additionalWallet1Address: "",
      additionalWallet2Label: "",
      additionalWallet2Address: "",
      twitterHandle: user?.twitterHandle || "",
      proofPostUrl1: "",
      proofPostUrl2: "",
      tokenUses: [],
      includeDollarSign: true,
      websiteUrl: "",
      telegramUrl: "",
      discordUrl: "",
      youtubeUrl: "",
      tiktokUrl: "",
      extraUrl1Label: "",
      extraUrl1: "",
      extraUrl2Label: "",
      extraUrl2: "",
      githubRepoOption: "none",
      githubRepoUrl: "",
      isPublic: true,
    },
  });

  // Watch token category and uses to generate summary
  const tokenCategory = useWatch({ control: form.control, name: "tokenCategory" });
  const tokenUses = useWatch({ control: form.control, name: "tokenUses" }) || [];
  const tokenTicker = useWatch({ control: form.control, name: "tokenTicker" });
  const tokenName = useWatch({ control: form.control, name: "tokenName" });
  const includeDollarSign = useWatch({ control: form.control, name: "includeDollarSign" });

  const generatedSummary = useMemo(() => {
    return generateTokenSummary(tokenCategory as TokenCategory, tokenUses as TokenUse[]);
  }, [tokenCategory, tokenUses]);

  // Generate ticker deviations for display
  const tickerDeviations = useMemo(() => {
    return generateTickerDeviations(tokenTicker || "");
  }, [tokenTicker]);

  // Generate name deviations for display
  const nameDeviations = useMemo(() => {
    return generateNameDeviations(tokenName || "");
  }, [tokenName]);

  // Format display ticker with optional $
  const displayTicker = useMemo(() => {
    if (!tokenTicker) return "";
    return includeDollarSign ? `$${tokenTicker.toUpperCase()}` : tokenTicker.toUpperCase();
  }, [tokenTicker, includeDollarSign]);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await uploadFormData("/api/logos/upload-token", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logos"] });
      toast({
        title: "Token Registered Successfully!",
        description: "Your token has been registered. Starting 24-hour ticker verification...",
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

  const onSubmit = (values: TokenLaunchFormValues) => {
    const formData = new FormData();

    if (values.file?.[0]) {
      formData.append("file", values.file[0]);
    }

    formData.append("tokenName", values.tokenName);
    formData.append("tokenTicker", values.tokenTicker.toUpperCase());
    formData.append("launchPlatform", values.launchPlatform);
    formData.append("launchTimeline", values.launchTimeline);

    const registrationData = {
      projectSummary: values.projectSummary,
      tokenCategory: values.tokenCategory,
      tokenUses: values.tokenUses || [],
      generatedSummary: generatedSummary,
      includeDollarSign: values.includeDollarSign,
      displayTicker: displayTicker,
      tickerDeviations: tickerDeviations,
      nameDeviations: nameDeviations,
      totalSupply: values.totalSupply,
      tokenomicsDetails: values.tokenomicsDetails,
      supplyLocked: values.supplyLocked,
      lockDuration: values.lockDuration || null,
      authorityWallet: values.authorityWallet,
      additionalWallet1Label: values.additionalWallet1Label || null,
      additionalWallet1Address: values.additionalWallet1Address || null,
      additionalWallet2Label: values.additionalWallet2Label || null,
      additionalWallet2Address: values.additionalWallet2Address || null,
      twitterHandle: values.twitterHandle,
      proofPostUrl1: values.proofPostUrl1 || null,
      proofPostUrl2: values.proofPostUrl2 || null,
      websiteUrl: values.websiteUrl || null,
      telegramUrl: values.telegramUrl || null,
      discordUrl: values.discordUrl || null,
      youtubeUrl: values.youtubeUrl || null,
      tiktokUrl: values.tiktokUrl || null,
      extraUrl1Label: values.extraUrl1Label || null,
      extraUrl1: values.extraUrl1 || null,
      extraUrl2Label: values.extraUrl2Label || null,
      extraUrl2: values.extraUrl2 || null,
      githubRepoOption: values.githubRepoOption,
      githubRepoUrl: values.githubRepoUrl || null,
      isPublic: values.isPublic,
      tokenContractAddress: values.tokenContractAddress || null,
      tokenContractChain: values.tokenContractChain || null,
      tokenPoolAddress: values.tokenPoolAddress || null,
    };

    formData.append("registrationData", JSON.stringify(registrationData));
    formData.append("description", values.projectSummary);
    formData.append(
      "intendedUse",
      `Token launch on ${values.launchPlatform}. ${values.tokenomicsDetails}`
    );
    formData.append("isPublic", values.isPublic ? "true" : "false");

    // Add contract address fields directly to formData for backend processing
    if (values.tokenContractAddress) {
      formData.append("tokenContractAddress", values.tokenContractAddress);
    }
    if (values.tokenContractChain) {
      formData.append("tokenContractChain", values.tokenContractChain);
    }
    if (values.tokenPoolAddress) {
      formData.append("tokenPoolAddress", values.tokenPoolAddress);
    }

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const supplyLocked = form.watch("supplyLocked");
  const githubRepoOption = form.watch("githubRepoOption");
  const isPublic = form.watch("isPublic");

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/register")}
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Template Selection
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Token Launch Registration</CardTitle>
              <CardDescription>
                Register your token with comprehensive IP protection
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Alert className="mb-6 bg-primary/5 border-primary/20">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertTitle>24-Hour Ticker Verification Required</AlertTitle>
        <AlertDescription className="text-sm">
          After registration, you must post your ticker 2 times on social media within 24 hours and
          submit proof URLs for verification.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Token Artwork</CardTitle>
              <CardDescription>
                Upload your token logo or artwork (PNG, JPG, or SVG)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e);
                          }}
                          {...field}
                          data-testid="input-file-upload"
                        />
                        {filePreview && (
                          <div className="flex justify-center">
                            <img
                              src={filePreview}
                              alt="Preview"
                              className="max-w-xs max-h-64 rounded border object-contain"
                              data-testid="img-file-preview"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Basic Token Info */}
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
              <CardDescription>Basic details about your token</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tokenName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Dragon Coin"
                        {...field}
                        data-testid="input-token-name"
                      />
                    </FormControl>
                    <FormDescription>The full name of your token</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Protected Name Variations Preview */}
              {nameDeviations.length > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    Protected Name Variations (auto-reserved)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    These name variations will be blocked from registration by others:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {nameDeviations.slice(0, 15).map((deviation) => (
                      <span
                        key={deviation}
                        className="px-2 py-0.5 bg-background rounded text-xs border"
                      >
                        {deviation}
                      </span>
                    ))}
                    {nameDeviations.length > 15 && (
                      <span className="px-2 py-0.5 text-xs text-muted-foreground">
                        +{nameDeviations.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="tokenTicker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Ticker/Symbol *</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            {includeDollarSign ? "$" : ""}
                          </span>
                          <Input
                            placeholder="e.g., DRGN"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                            }
                            maxLength={10}
                            className={includeDollarSign ? "pl-7" : ""}
                            data-testid="input-token-ticker"
                          />
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription>
                      Uppercase letters and numbers only (max 10 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeDollarSign"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-include-dollar-sign"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="font-normal cursor-pointer">
                        Include $ prefix in ticker
                      </FormLabel>
                      {displayTicker && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          (Display as:{" "}
                          <span className="font-mono font-medium">{displayTicker}</span>)
                        </span>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {/* Protected Deviations Preview */}
              {tickerDeviations.length > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    Protected Variations (auto-reserved)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    These variations will be blocked from registration by others:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tickerDeviations.slice(0, 12).map((deviation) => (
                      <span
                        key={deviation}
                        className="px-2 py-0.5 bg-background rounded text-xs font-mono border"
                      >
                        {deviation}
                      </span>
                    ))}
                    {tickerDeviations.length > 12 && (
                      <span className="px-2 py-0.5 text-xs text-muted-foreground">
                        +{tickerDeviations.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="projectSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Project Summary *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your token project..."
                        rows={5}
                        maxLength={1500}
                        {...field}
                        data-testid="textarea-project-summary"
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0}/1500 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Legal Questionnaire */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Legal Protection Questionnaire</CardTitle>
              <CardDescription>
                These questions establish "full intent" for maximum IP protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* When */}
              <FormField
                control={form.control}
                name="launchTimeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      1. When will you launch this token? *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-launch-timeline">
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="within_7_days">Within 7 days</SelectItem>
                        <SelectItem value="1_month">Within 1 month</SelectItem>
                        <SelectItem value="1_2_months">1-2 months</SelectItem>
                        <SelectItem value="2plus_months">More than 2 months</SelectItem>
                        <SelectItem value="already_launched">Already launched</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Where */}
              <FormField
                control={form.control}
                name="launchPlatform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      2. Where will you launch this token? *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-launch-platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pumpfun">Pump.fun</SelectItem>
                        <SelectItem value="raydium">Raydium</SelectItem>
                        <SelectItem value="jupiter">Jupiter</SelectItem>
                        <SelectItem value="orca">Orca</SelectItem>
                        <SelectItem value="moonshot">Moonshot</SelectItem>
                        <SelectItem value="dexscreener">DexScreener</SelectItem>
                        <SelectItem value="dextools">DexTools</SelectItem>
                        <SelectItem value="birdeye">Birdeye</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Contract Address - Optional Pre-launch */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold text-base">Contract Address (Optional)</Label>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    Pre-launch: CA not available yet? That's OK
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Most projects don't have a contract address until launch. You can add it later and
                  bind it to your media metadata.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tokenContractChain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chain</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contract-chain">
                              <SelectValue placeholder="Select chain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="solana">Solana</SelectItem>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="base">Base</SelectItem>
                            <SelectItem value="arbitrum">Arbitrum</SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tokenContractAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 7xKX..."
                            {...field}
                            data-testid="input-contract-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tokenPoolAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pool/Pair Address (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DEX liquidity pool address (if available)"
                          {...field}
                          data-testid="input-pool-address"
                        />
                      </FormControl>
                      <FormDescription>
                        Add your DEX pool address for enhanced verification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Token Category */}
              <FormField
                control={form.control}
                name="tokenCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      3. What type of token is this? *
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3"
                      >
                        {Object.entries(TOKEN_CATEGORIES).map(([key, { label, description }]) => (
                          <div
                            key={key}
                            className="flex items-start space-x-2 p-2 rounded-md hover-elevate"
                          >
                            <RadioGroupItem
                              value={key}
                              id={`category-${key}`}
                              data-testid={`radio-token-category-${key}`}
                              className="mt-0.5"
                            />
                            <Label
                              htmlFor={`category-${key}`}
                              className="font-normal cursor-pointer"
                            >
                              <span className="font-medium">{label}</span>
                              <span className="block text-sm text-muted-foreground">
                                {description}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Token Uses */}
              <FormField
                control={form.control}
                name="tokenUses"
                render={() => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      3b. What will this token be used for? (select up to 2)
                    </FormLabel>
                    <FormDescription className="mt-1 mb-3">
                      Optional - helps generate a more specific token description
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(TOKEN_USES).map(([key, { label }]) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name="tokenUses"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 p-2 rounded-md hover-elevate">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(key as TokenUse)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      if (current.length < 2) {
                                        field.onChange([...current, key]);
                                      }
                                    } else {
                                      field.onChange(current.filter((v: string) => v !== key));
                                    }
                                  }}
                                  disabled={
                                    !field.value?.includes(key as TokenUse) &&
                                    (field.value?.length || 0) >= 2
                                  }
                                  data-testid={`checkbox-token-use-${key}`}
                                />
                              </FormControl>
                              <Label className="font-normal cursor-pointer text-sm">{label}</Label>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generated Summary Preview */}
              {generatedSummary && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Auto-generated Token Description
                  </Label>
                  <p className="mt-1 text-sm">{generatedSummary}</p>
                </div>
              )}

              <Separator />

              {/* Total Supply */}
              <FormField
                control={form.control}
                name="totalSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      4. What is the total circulating supply? *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1,000,000,000 or 1 billion"
                        {...field}
                        data-testid="input-total-supply"
                      />
                    </FormControl>
                    <FormDescription>Total number of tokens that will exist</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Tokenomics */}
              <FormField
                control={form.control}
                name="tokenomicsDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      5. Describe your tokenomics distribution *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., 80% liquidity pool, 10% team (vested 12 months), 5% marketing, 5% community rewards..."
                        rows={4}
                        maxLength={2000}
                        {...field}
                        data-testid="textarea-tokenomics"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormDescription>
                        How will tokens be distributed? Include percentages for liquidity, team,
                        marketing, etc. (minimum 30 characters)
                      </FormDescription>
                      <span className={`text-xs shrink-0 ml-2 ${(field.value?.length || 0) >= 2000 ? "text-destructive" : "text-muted-foreground"}`}>
                        {field.value?.length || 0}/2000
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Supply Lock */}
              <FormField
                control={form.control}
                name="supplyLocked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      6. Will any portion of the supply be locked for longer than 1 year? *
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="yes"
                            id="locked-yes"
                            data-testid="radio-supply-locked-yes"
                          />
                          <Label htmlFor="locked-yes" className="font-normal cursor-pointer">
                            Yes, some supply will be locked for 1+ years
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="no"
                            id="locked-no"
                            data-testid="radio-supply-locked-no"
                          />
                          <Label htmlFor="locked-no" className="font-normal cursor-pointer">
                            No, no long-term locks
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {supplyLocked === "yes" && (
                <FormField
                  control={form.control}
                  name="lockDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify lock duration and amount</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="E.g., 10% of team tokens locked for 2 years with 6-month vesting cliff..."
                          rows={3}
                          {...field}
                          data-testid="textarea-lock-duration"
                        />
                      </FormControl>
                      <FormDescription>
                        Describe which tokens are locked and for how long
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              <FormField
                control={form.control}
                name="authorityWallet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      7. Authority / Dev Wallet *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 7xKQ...9mPz (your Solana wallet address)"
                        {...field}
                        data-testid="input-authority-wallet"
                      />
                    </FormControl>
                    <FormDescription>
                      The wallet that will sign transactions and fund the token launch. This links
                      your on-chain activity to your Solturio registration.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="font-semibold text-sm text-muted-foreground pt-2">
                Additional Wallets (Optional)
              </h3>
              <FormDescription className="text-xs">
                If your project uses separate wallets for treasury, marketing, or liquidity, you can
                register them here for transparency.
              </FormDescription>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <FormField
                    control={form.control}
                    name="additionalWallet1Label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wallet className="w-3 h-3" />
                          Wallet Purpose
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Treasury"
                            {...field}
                            data-testid="input-wallet1-label"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="additionalWallet1Address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Wallet Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Wallet address..."
                            {...field}
                            data-testid="input-wallet1-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <FormField
                    control={form.control}
                    name="additionalWallet2Label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wallet className="w-3 h-3" />
                          Wallet Purpose
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Marketing"
                            {...field}
                            data-testid="input-wallet2-label"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="additionalWallet2Address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Wallet Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Wallet address..."
                            {...field}
                            data-testid="input-wallet2-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="twitterHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <SiX className="w-4 h-4" />
                      8. Twitter / X Handle *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@yourusername"
                        {...field}
                        maxLength={50}
                        onBlur={(e) => { field.onBlur(); field.onChange(e.target.value.replace(/^@+/, "")); }}
                        data-testid="input-twitter"
                      />
                    </FormControl>
                    <FormDescription>Your project's Twitter/X account handle</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert className="bg-muted/50 border-muted-foreground/20">
                <Info className="h-4 w-4" />
                <AlertTitle>24-Hour Ticker Verification</AlertTitle>
                <AlertDescription className="text-sm space-y-2">
                  <p>
                    To verify ownership of your ticker, you need to post about it on Twitter/X{" "}
                    <strong>twice within 24 hours</strong> of registration.
                  </p>
                  <p className="text-muted-foreground">How it works:</p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                    <li>Post your ticker (e.g., "$CATH") on Twitter/X from your project account</li>
                    <li>Copy the URL of that tweet and paste it in "Proof Post 1" below</li>
                    <li>Post again within 24 hours and paste the second URL in "Proof Post 2"</li>
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    You can add these URLs now or come back to fill them in later from your
                    dashboard.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="proofPostUrl1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proof Post 1</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://x.com/yourproject/status/..."
                          {...field}
                          data-testid="input-proof-post-1"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Paste the URL of your first ticker post
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proofPostUrl2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proof Post 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://x.com/yourproject/status/..."
                          {...field}
                          data-testid="input-proof-post-2"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Paste the URL of your second ticker post
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <h3 className="font-semibold text-sm text-muted-foreground pt-2">
                Project Links & Social Media
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourproject.com"
                          {...field}
                          data-testid="input-website-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telegramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <SiTelegram className="w-4 h-4" />
                        Telegram
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://t.me/yourgroup"
                          {...field}
                          data-testid="input-telegram-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discordUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <SiDiscord className="w-4 h-4" />
                        Discord
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://discord.gg/yourserver"
                          {...field}
                          data-testid="input-discord-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <SiYoutube className="w-4 h-4" />
                        YouTube
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://youtube.com/@yourchannel"
                          {...field}
                          data-testid="input-youtube-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiktokUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <SiTiktok className="w-4 h-4" />
                        TikTok
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://tiktok.com/@yourprofile"
                          {...field}
                          data-testid="input-tiktok-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <h3 className="font-semibold text-sm text-muted-foreground pt-2">Additional Links</h3>
              <FormDescription className="text-xs">
                Add any other community or platform links (e.g., Lemonade, Fanbase, Medium, Reddit)
              </FormDescription>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <FormField
                    control={form.control}
                    name="extraUrl1Label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Platform Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Lemonade"
                            {...field}
                            data-testid="input-extra-url1-label"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="extraUrl1"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            {...field}
                            data-testid="input-extra-url1"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <FormField
                    control={form.control}
                    name="extraUrl2Label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Platform Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Fanbase"
                            {...field}
                            data-testid="input-extra-url2-label"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="extraUrl2"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            {...field}
                            data-testid="input-extra-url2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="githubRepoOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <SiGithub className="w-4 h-4" />
                      9. GitHub Repository
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="none"
                            id="github-none"
                            data-testid="radio-github-none"
                          />
                          <Label htmlFor="github-none" className="font-normal cursor-pointer">
                            No GitHub repo needed
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="create_new"
                            id="github-create"
                            data-testid="radio-github-create"
                          />
                          <Label htmlFor="github-create" className="font-normal cursor-pointer">
                            Create a new GitHub repo for this token
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="link_existing"
                            id="github-link"
                            data-testid="radio-github-link"
                          />
                          <Label htmlFor="github-link" className="font-normal cursor-pointer">
                            Link an existing GitHub repo
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Connecting a GitHub repo strengthens your proof of development timeline
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {githubRepoOption === "link_existing" && (
                <FormField
                  control={form.control}
                  name="githubRepoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub Repository URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://github.com/username/repo"
                          {...field}
                          data-testid="input-github-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {githubRepoOption === "create_new" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <SiGithub className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    After registration, you'll be guided to connect your GitHub account and create a
                    repo for this project.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      {field.value ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      10. Token Folder Visibility
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => field.onChange(val === "public")}
                        defaultValue={field.value ? "public" : "private"}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem
                            value="public"
                            id="visibility-public"
                            data-testid="radio-visibility-public"
                          />
                          <div>
                            <Label
                              htmlFor="visibility-public"
                              className="font-normal cursor-pointer"
                            >
                              Public
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Visible in public search and eligible for platform rewards
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem
                            value="private"
                            id="visibility-private"
                            data-testid="radio-visibility-private"
                          />
                          <div>
                            <Label
                              htmlFor="visibility-private"
                              className="font-normal cursor-pointer"
                            >
                              Private
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Hidden from public search; not eligible for rewards
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/register")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={uploadMutation.isPending}
              data-testid="button-submit-token-registration"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering Token...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Register Token & Start Verification
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

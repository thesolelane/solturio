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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Rocket, Upload, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

const tokenLaunchSchema = z.object({
  file: z.any().refine((files) => files?.length > 0, "Please upload your token artwork"),
  
  tokenName: z.string().min(2, "Token name must be at least 2 characters").max(100),
  tokenTicker: z.string().min(1, "Ticker is required").max(10, "Ticker must be 10 characters or less").regex(/^[A-Z0-9]+$/, "Ticker must be uppercase letters and numbers only"),
  
  projectSummary: z.string().min(10, "Summary must be at least 10 characters").max(300, "Summary must be 300 characters or less"),
  
  launchTimeline: z.string().min(1, "Please select when you will launch"),
  launchPlatform: z.string().min(1, "Please select where you will launch"),
  
  tokenType: z.enum(["meme", "utility"], { required_error: "Please select token type" }),
  
  totalSupply: z.string().min(1, "Please specify total supply"),
  tokenomicsDetails: z.string().min(30, "Please describe tokenomics (minimum 30 characters)"),
  
  supplyLocked: z.enum(["yes", "no"], { required_error: "Please specify if supply will be locked" }),
  lockDuration: z.string().optional(),
  
  twitterHandle: z.string().min(1, "Twitter/X handle is required for verification").regex(/^@?[A-Za-z0-9_]+$/, "Invalid Twitter handle"),
});

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
    defaultValues: {
      supplyLocked: "no",
      twitterHandle: user?.twitterHandle || "",
    },
  });

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
      tokenType: values.tokenType,
      totalSupply: values.totalSupply,
      tokenomicsDetails: values.tokenomicsDetails,
      supplyLocked: values.supplyLocked,
      lockDuration: values.lockDuration || null,
      twitterHandle: values.twitterHandle,
    };
    
    formData.append("registrationData", JSON.stringify(registrationData));
    formData.append("description", values.projectSummary);
    formData.append("intendedUse", `Token launch on ${values.launchPlatform}. ${values.tokenomicsDetails}`);
    
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
          After registration, you must post your ticker 2 times on social media within 24 hours and submit proof URLs for verification.
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
                              className="max-w-xs max-h-64 rounded border"
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
              <CardDescription>
                Basic details about your token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tokenName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dragon Coin" {...field} data-testid="input-token-name" />
                    </FormControl>
                    <FormDescription>The full name of your token</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tokenTicker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Ticker/Symbol *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., DRGN" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        maxLength={10}
                        data-testid="input-token-ticker"
                      />
                    </FormControl>
                    <FormDescription>Uppercase letters and numbers only (max 10 characters)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Project Summary *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quick summary of your token project (max 300 characters)..."
                        rows={3}
                        maxLength={300}
                        {...field}
                        data-testid="textarea-project-summary"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum 300 characters - {field.value?.length || 0}/300
                    </FormDescription>
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
                    <FormLabel className="font-semibold">1. When will you launch this token? *</FormLabel>
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
                    <FormLabel className="font-semibold">2. Where will you launch this token? *</FormLabel>
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

              {/* Token Type */}
              <FormField
                control={form.control}
                name="tokenType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">3. Is this a meme token or utility token? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="meme" id="type-meme" data-testid="radio-token-type-meme" />
                          <Label htmlFor="type-meme" className="font-normal cursor-pointer">
                            Meme token (community-driven, entertainment value)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="utility" id="type-utility" data-testid="radio-token-type-utility" />
                          <Label htmlFor="type-utility" className="font-normal cursor-pointer">
                            Utility token (provides specific function, service, or access)
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Total Supply */}
              <FormField
                control={form.control}
                name="totalSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">4. What is the total circulating supply? *</FormLabel>
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
                    <FormLabel className="font-semibold">5. Describe your tokenomics distribution *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., 80% liquidity pool, 10% team (vested 12 months), 5% marketing, 5% community rewards..."
                        rows={4}
                        {...field}
                        data-testid="textarea-tokenomics"
                      />
                    </FormControl>
                    <FormDescription>
                      How will tokens be distributed? Include percentages for liquidity, team, marketing, etc. (minimum 30 characters)
                    </FormDescription>
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
                    <FormLabel className="font-semibold">6. Will any portion of the supply be locked for longer than 1 year? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="locked-yes" data-testid="radio-supply-locked-yes" />
                          <Label htmlFor="locked-yes" className="font-normal cursor-pointer">
                            Yes, some supply will be locked for 1+ years
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="locked-no" data-testid="radio-supply-locked-no" />
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
                      <FormDescription>Describe which tokens are locked and for how long</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* Twitter Verification */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Social Media Required for Verification</AlertTitle>
                <AlertDescription className="text-sm">
                  Twitter/X is required for the 24-hour ticker verification system. You'll need to post your ticker twice within 24 hours.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="twitterHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">7. Twitter/X Handle (for 24-hour verification) *</FormLabel>
                    <FormControl>
                      <Input placeholder="@yourusername" {...field} data-testid="input-twitter" />
                    </FormControl>
                    <FormDescription>Required for ticker verification process</FormDescription>
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

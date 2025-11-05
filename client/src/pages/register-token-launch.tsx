import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload as UploadIcon, Rocket } from "lucide-react";

const tokenLaunchSchema = z.object({
  // Token basics
  tokenName: z.string().min(1, "Token name is required").max(100),
  tokenTicker: z.string().min(1, "Ticker is required").max(20).regex(/^[A-Z]+$/, "Ticker must be uppercase letters only"),
  
  // Launch details
  launchPlatform: z.string().min(1, "Please select a launch platform"),
  launchTimeline: z.string().min(1, "Please select launch timeline"),
  
  // Social media
  twitterUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  telegramUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  discordUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  
  // Smart questions for legal protection
  tokenType: z.enum(["meme", "utility", "governance", "other"]),
  hasWhitepaper: z.enum(["yes", "no"]),
  artworkCreator: z.enum(["self", "hired", "ai", "other"]),
  trademarkConflict: z.enum(["no_conflicts", "checked_no_conflicts", "unsure"]),
  presaleType: z.enum(["fair_launch", "presale", "airdrop", "other", "undecided"]),
  
  // Project description
  projectDescription: z.string().min(50, "Please provide at least 50 characters").max(1000),
  intendedUse: z.string().min(20, "Please describe intended use (min 20 characters)").max(500),
  
  // Artwork file
  artworkFile: z.any().optional(), // Will handle file validation separately
});

type TokenLaunchForm = z.infer<typeof tokenLaunchSchema>;

export default function RegisterTokenLaunch() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const form = useForm<TokenLaunchForm>({
    resolver: zodResolver(tokenLaunchSchema),
    defaultValues: {
      tokenName: "",
      tokenTicker: "",
      launchPlatform: "",
      launchTimeline: "",
      twitterUrl: "",
      telegramUrl: "",
      discordUrl: "",
      websiteUrl: "",
      projectDescription: "",
      intendedUse: "",
    },
  });

  const onSubmit = async (data: TokenLaunchForm) => {
    console.log("Token Launch Registration:", data);
    // This will proceed to wallet tier selection
    setLocation("/register/wallet-tier");
  };

  const nextStep = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof TokenLaunchForm)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ["tokenName", "tokenTicker", "launchPlatform", "launchTimeline"];
    } else if (step === 2) {
      fieldsToValidate = ["tokenType", "hasWhitepaper", "artworkCreator", "trademarkConflict", "presaleType"];
    } else if (step === 3) {
      fieldsToValidate = ["projectDescription", "intendedUse"];
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/register")}
          className="mb-4"
          data-testid="button-back-to-templates"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Token Launch Registration</h1>
            <p className="text-muted-foreground">Complete protection for your new token project</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Token Information</CardTitle>
                <CardDescription>
                  Provide the core details of your token project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      <FormLabel>Token Ticker *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., DRGN" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-token-ticker"
                        />
                      </FormControl>
                      <FormDescription>
                        Uppercase letters only (e.g., BTC, ETH, DOGE). You'll need to use this ticker 2x on social media within 24 hours.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="launchPlatform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where will you launch? *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-launch-platform">
                            <SelectValue placeholder="Select launch platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pumpfun">Pump.fun</SelectItem>
                          <SelectItem value="raydium">Raydium</SelectItem>
                          <SelectItem value="jupiter">Jupiter</SelectItem>
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

                <FormField
                  control={form.control}
                  name="launchTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When do you plan to launch? *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-launch-timeline">
                            <SelectValue placeholder="Select timeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
              </CardContent>
            </Card>
          )}

          {/* Step 2: Legal & Smart Questions */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Legal Protection Questions</CardTitle>
                <CardDescription>
                  These questions establish "full intent" and strengthen your IP protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="tokenType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What type of token is this? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="meme" id="meme" data-testid="radio-token-type-meme" />
                            <Label htmlFor="meme" className="font-normal cursor-pointer">Meme token (community-driven, fun)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="utility" id="utility" data-testid="radio-token-type-utility" />
                            <Label htmlFor="utility" className="font-normal cursor-pointer">Utility token (provides specific function/access)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="governance" id="governance" data-testid="radio-token-type-governance" />
                            <Label htmlFor="governance" className="font-normal cursor-pointer">Governance token (voting rights)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other" data-testid="radio-token-type-other" />
                            <Label htmlFor="other" className="font-normal cursor-pointer">Other</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasWhitepaper"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you have a whitepaper or documentation? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="whitepaper-yes" data-testid="radio-whitepaper-yes" />
                            <Label htmlFor="whitepaper-yes" className="font-normal cursor-pointer">Yes, I have documentation</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="whitepaper-no" data-testid="radio-whitepaper-no" />
                            <Label htmlFor="whitepaper-no" className="font-normal cursor-pointer">No, planning to create one</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artworkCreator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who created the token artwork/logo? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="self" id="creator-self" data-testid="radio-creator-self" />
                            <Label htmlFor="creator-self" className="font-normal cursor-pointer">I created it myself</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="hired" id="creator-hired" data-testid="radio-creator-hired" />
                            <Label htmlFor="creator-hired" className="font-normal cursor-pointer">I hired a designer</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ai" id="creator-ai" data-testid="radio-creator-ai" />
                            <Label htmlFor="creator-ai" className="font-normal cursor-pointer">AI-generated</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="creator-other" data-testid="radio-creator-other" />
                            <Label htmlFor="creator-other" className="font-normal cursor-pointer">Other</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trademarkConflict"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you aware of trademark conflicts with this name/ticker? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="checked_no_conflicts" id="checked-no" data-testid="radio-trademark-checked" />
                            <Label htmlFor="checked-no" className="font-normal cursor-pointer">I checked, no conflicts found</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no_conflicts" id="no-conflicts" data-testid="radio-trademark-none" />
                            <Label htmlFor="no-conflicts" className="font-normal cursor-pointer">Not aware of any conflicts</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="unsure" id="unsure" data-testid="radio-trademark-unsure" />
                            <Label htmlFor="unsure" className="font-normal cursor-pointer">Unsure / Need to check</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Checking for trademark conflicts strengthens your legal claim
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="presaleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What type of launch are you planning? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fair_launch" id="fair-launch" data-testid="radio-presale-fair" />
                            <Label htmlFor="fair-launch" className="font-normal cursor-pointer">Fair launch (no presale)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="presale" id="presale" data-testid="radio-presale-presale" />
                            <Label htmlFor="presale" className="font-normal cursor-pointer">Presale / ICO</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="airdrop" id="airdrop" data-testid="radio-presale-airdrop" />
                            <Label htmlFor="airdrop" className="font-normal cursor-pointer">Airdrop</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="launch-other" data-testid="radio-presale-other" />
                            <Label htmlFor="launch-other" className="font-normal cursor-pointer">Other</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="undecided" id="undecided" data-testid="radio-presale-undecided" />
                            <Label htmlFor="undecided" className="font-normal cursor-pointer">Still deciding</Label>
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

          {/* Step 3: Project Description & Intent */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  Detailed descriptions strengthen your ownership claim and establish clear intent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="projectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your token project, its purpose, community, and vision..."
                          className="min-h-[150px]"
                          {...field}
                          data-testid="textarea-project-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 50 characters. Be specific about your project's goals and unique features.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intendedUse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intended Use of Logo/Artwork *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Where will you use this logo? DEX listings, social media, merchandise, etc..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-intended-use"
                        />
                      </FormControl>
                      <FormDescription>
                        List all platforms and uses (e.g., DexScreener, Twitter, Discord, merchandise)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="twitterUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter/X URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://x.com/yourproject" {...field} data-testid="input-twitter-url" />
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
                        <FormLabel>Telegram URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://t.me/yourproject" {...field} data-testid="input-telegram-url" />
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
                        <FormLabel>Discord URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://discord.gg/yourproject" {...field} data-testid="input-discord-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourproject.com" {...field} data-testid="input-website-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Upload Artwork */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Token Artwork</CardTitle>
                <CardDescription>
                  Upload your token logo or artwork. We'll generate a secure IPFS hash and blockchain timestamp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-12 text-center hover-elevate cursor-pointer">
                  <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Drop your artwork here</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supported formats: PNG, JPG, SVG • Max size: 10MB
                  </p>
                  <Button type="button" variant="outline" data-testid="button-browse-files">
                    Browse Files
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">Important:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Solturio will upload to IPFS (you don't upload yourself)</li>
                    <li>We store only thumbnails + JSON metadata</li>
                    <li>This prevents copycat abuse via hash-copying</li>
                    <li>Your IPFS hash proves you registered first</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div>
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  data-testid="button-previous-step"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  data-testid="button-next-step"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  data-testid="button-continue-to-wallet"
                >
                  Continue to Wallet Selection
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

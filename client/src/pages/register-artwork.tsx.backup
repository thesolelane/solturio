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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload as UploadIcon, Palette } from "lucide-react";

const artworkSchema = z.object({
  // Artwork basics
  artworkTitle: z.string().min(1, "Artwork title is required").max(200),
  
  // Creator information
  createdBy: z.enum(["self", "hired", "ai", "other"]),
  creatorName: z.string().min(1, "Creator name is required").max(100),
  
  // Licensing & Usage
  planToLicense: z.enum(["yes", "no", "maybe"]),
  planToMintNFT: z.enum(["yes", "no", "maybe"]),
  usedInToken: z.enum(["no", "yes_planning", "yes_already"]),
  
  // Ownership & Rights
  haveRights: z.enum(["yes_full", "yes_licensed", "unsure"]),
  similarWorkExists: z.enum(["no", "yes_different", "checked_unique"]),
  
  // Project description
  artworkDescription: z.string().min(30, "Please provide at least 30 characters").max(1000),
  intendedUse: z.string().min(20, "Please describe intended use (min 20 characters)").max(500),
  
  // Where will this be used
  portfolioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  
  // Artwork file
  artworkFile: z.any().optional(), // Will handle file validation separately
});

type ArtworkForm = z.infer<typeof artworkSchema>;

export default function RegisterArtwork() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const form = useForm<ArtworkForm>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      artworkTitle: "",
      creatorName: "",
      artworkDescription: "",
      intendedUse: "",
      portfolioUrl: "",
      websiteUrl: "",
    },
  });

  const onSubmit = async (data: ArtworkForm) => {
    console.log("Artwork Registration:", data);
    // This will proceed to wallet tier selection
    setLocation("/register/wallet-tier");
  };

  const nextStep = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof ArtworkForm)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ["artworkTitle", "createdBy", "creatorName"];
    } else if (step === 2) {
      fieldsToValidate = ["planToLicense", "planToMintNFT", "usedInToken", "haveRights", "similarWorkExists", "artworkDescription", "intendedUse"];
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
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Artwork Registration</h1>
            <p className="text-muted-foreground">Protect your creative work with blockchain verification</p>
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
                <CardTitle>Artwork Details</CardTitle>
                <CardDescription>
                  Basic information about your creative work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="artworkTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artwork Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sunset Dragon Logo" {...field} data-testid="input-artwork-title" />
                      </FormControl>
                      <FormDescription>The name or title of this artwork</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="createdBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who created this artwork? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="self" id="self" data-testid="radio-creator-self" />
                            <Label htmlFor="self" className="font-normal cursor-pointer">I created it myself</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="hired" id="hired" data-testid="radio-creator-hired" />
                            <Label htmlFor="hired" className="font-normal cursor-pointer">I hired a designer/artist</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ai" id="ai" data-testid="radio-creator-ai" />
                            <Label htmlFor="ai" className="font-normal cursor-pointer">AI-generated (I own the rights)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other" data-testid="radio-creator-other" />
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
                  name="creatorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creator/Artist Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name or artist name" {...field} data-testid="input-creator-name" />
                      </FormControl>
                      <FormDescription>
                        The name to be credited for this work
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Usage & Rights Questions */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Usage & Rights Information</CardTitle>
                <CardDescription>
                  These questions help establish your ownership rights and intended usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="planToLicense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you plan to license or sell this artwork to clients? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="license-yes" data-testid="radio-license-yes" />
                            <Label htmlFor="license-yes" className="font-normal cursor-pointer">Yes, I plan to license/sell this work</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="license-no" data-testid="radio-license-no" />
                            <Label htmlFor="license-no" className="font-normal cursor-pointer">No, personal use only</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="maybe" id="license-maybe" data-testid="radio-license-maybe" />
                            <Label htmlFor="license-maybe" className="font-normal cursor-pointer">Maybe / Considering it</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Solturio provides licensing badges for work sold to clients
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planToMintNFT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you plan to mint this as an NFT? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="nft-yes" data-testid="radio-nft-yes" />
                            <Label htmlFor="nft-yes" className="font-normal cursor-pointer">Yes, planning NFT mint</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="nft-no" data-testid="radio-nft-no" />
                            <Label htmlFor="nft-no" className="font-normal cursor-pointer">No NFT plans</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="maybe" id="nft-maybe" data-testid="radio-nft-maybe" />
                            <Label htmlFor="nft-maybe" className="font-normal cursor-pointer">Maybe / Undecided</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usedInToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Has this been or will this be used in a token/NFT launch? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="token-no" data-testid="radio-token-no" />
                            <Label htmlFor="token-no" className="font-normal cursor-pointer">No token connection</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes_planning" id="token-planning" data-testid="radio-token-planning" />
                            <Label htmlFor="token-planning" className="font-normal cursor-pointer">Yes, planning to use for a token</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes_already" id="token-already" data-testid="radio-token-already" />
                            <Label htmlFor="token-already" className="font-normal cursor-pointer">Yes, already used in token launch</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        If yes, consider using the Token Launch template for stronger protection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="haveRights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you own the full rights to this artwork? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes_full" id="rights-full" data-testid="radio-rights-full" />
                            <Label htmlFor="rights-full" className="font-normal cursor-pointer">Yes, I own full rights</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes_licensed" id="rights-licensed" data-testid="radio-rights-licensed" />
                            <Label htmlFor="rights-licensed" className="font-normal cursor-pointer">Yes, via license agreement</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="unsure" id="rights-unsure" data-testid="radio-rights-unsure" />
                            <Label htmlFor="rights-unsure" className="font-normal cursor-pointer">Unsure / Need to verify</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="similarWorkExists"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you aware of similar artwork that exists? *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="checked_unique" id="checked-unique" data-testid="radio-similar-checked" />
                            <Label htmlFor="checked-unique" className="font-normal cursor-pointer">I checked, this is unique</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="similar-no" data-testid="radio-similar-no" />
                            <Label htmlFor="similar-no" className="font-normal cursor-pointer">Not aware of similar work</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes_different" id="similar-yes" data-testid="radio-similar-yes" />
                            <Label htmlFor="similar-yes" className="font-normal cursor-pointer">Yes, but mine is clearly different</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artworkDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artwork Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your artwork, its style, inspiration, and unique features..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-artwork-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 30 characters. Be specific about what makes this work unique.
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
                      <FormLabel>Intended Use *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="How will you use this artwork? Portfolio, client work, merchandise, social media..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-intended-use"
                        />
                      </FormControl>
                      <FormDescription>
                        List all planned uses and platforms
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="portfolioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portfolio URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourportfolio.com" {...field} data-testid="input-portfolio-url" />
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
                          <Input placeholder="https://yourwebsite.com" {...field} data-testid="input-website-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Upload Artwork */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Artwork</CardTitle>
                <CardDescription>
                  Upload your artwork file. We'll create a secure IPFS hash and blockchain record.
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
                  <h4 className="font-semibold text-sm">Solturio Protection:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>We control IPFS uploads to prevent hash-copying abuse</li>
                    <li>Only thumbnails stored (not full images)</li>
                    <li>Your IPFS hash + timestamp = proof of first registration</li>
                    <li>Perfect for artists licensing work to clients</li>
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

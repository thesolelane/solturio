import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Palette, Upload, ArrowLeft, Loader2 } from "lucide-react";

const artworkSchema = z.object({
  file: z.any().refine((files) => files?.length > 0, "Please upload your artwork"),
  
  artworkTitle: z.string().min(2, "Title must be at least 2 characters").max(200),
  
  artworkSummary: z.string().min(10, "Summary must be at least 10 characters").max(300, "Summary must be 300 characters or less"),
  
  createdBy: z.enum(["self", "hired", "team"], { required_error: "Please specify who created this" }),
  creatorDetails: z.string().optional(),
  
  whenCreated: z.string().min(1, "Please specify when this was created"),
  
  planToLicense: z.enum(["yes", "no", "unsure"], { required_error: "Please specify licensing plans" }),
  licensingDetails: z.string().optional(),
  
  planToMintNFT: z.enum(["yes", "no", "unsure"], { required_error: "Please specify NFT plans" }),
  
  intendedUse: z.string().min(20, "Please describe intended use (minimum 20 characters)"),
  
  portfolioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ArtworkFormValues = z.infer<typeof artworkSchema>;

export default function RegisterArtwork() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Artwork Registration - Solturio";
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

  const form = useForm<ArtworkFormValues>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      createdBy: "self",
      planToLicense: "unsure",
      planToMintNFT: "unsure",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/logos/upload-artwork", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logos"] });
      toast({
        title: "Artwork Registered Successfully!",
        description: "Your artwork has been registered with blockchain-verified proof of ownership.",
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
    
    const registrationData = {
      artworkSummary: values.artworkSummary,
      createdBy: values.createdBy,
      creatorDetails: values.creatorDetails || null,
      whenCreated: values.whenCreated,
      planToLicense: values.planToLicense,
      licensingDetails: values.licensingDetails || null,
      planToMintNFT: values.planToMintNFT,
      portfolioUrl: values.portfolioUrl || null,
    };
    
    formData.append("registrationData", JSON.stringify(registrationData));
    formData.append("description", `${values.artworkTitle}: ${values.artworkSummary}`);
    formData.append("intendedUse", values.intendedUse);
    
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

  const createdBy = form.watch("createdBy");
  const planToLicense = form.watch("planToLicense");

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
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Artwork Registration</CardTitle>
              <CardDescription>
                Protect your creative work with blockchain-verified proof of ownership
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Artwork File</CardTitle>
              <CardDescription>
                Upload your artwork, logo, or design (PNG, JPG, or SVG)
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

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Artwork Information</CardTitle>
              <CardDescription>
                Basic details about your artwork
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="artworkTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artwork Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cyber Dragon Logo" {...field} data-testid="input-artwork-title" />
                    </FormControl>
                    <FormDescription>The title or name of this artwork</FormDescription>
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
                        placeholder="Quick description of your artwork (max 300 characters)..."
                        rows={3}
                        maxLength={300}
                        {...field}
                        data-testid="textarea-artwork-summary"
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
              <CardTitle className="text-primary">Proof of Creation Questionnaire</CardTitle>
              <CardDescription>
                These questions establish your ownership and creative rights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Who Created */}
              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">1. Who created this artwork? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="self" id="created-self" data-testid="radio-created-self" />
                          <Label htmlFor="created-self" className="font-normal cursor-pointer">
                            I created it myself
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hired" id="created-hired" data-testid="radio-created-hired" />
                          <Label htmlFor="created-hired" className="font-normal cursor-pointer">
                            I hired/commissioned a designer
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

              {(createdBy === "hired" || createdBy === "team") && (
                <FormField
                  control={form.control}
                  name="creatorDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provide details about who created this</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="E.g., Hired designer John Doe, signed rights transfer agreement on Jan 1, 2025..."
                          rows={3}
                          {...field}
                          data-testid="textarea-creator-details"
                        />
                      </FormControl>
                      <FormDescription>Include any contracts or rights agreements</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* When Created */}
              <FormField
                control={form.control}
                name="whenCreated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">2. When was this artwork created? *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-when-created" />
                    </FormControl>
                    <FormDescription>This establishes your creation timeline</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Licensing Plans */}
              <FormField
                control={form.control}
                name="planToLicense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">3. Do you plan to license this artwork to others? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="license-yes" data-testid="radio-license-yes" />
                          <Label htmlFor="license-yes" className="font-normal cursor-pointer">
                            Yes, I plan to license it
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="license-no" data-testid="radio-license-no" />
                          <Label htmlFor="license-no" className="font-normal cursor-pointer">
                            No, for my exclusive use only
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unsure" id="license-unsure" data-testid="radio-license-unsure" />
                          <Label htmlFor="license-unsure" className="font-normal cursor-pointer">
                            Unsure / Considering options
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {planToLicense === "yes" && (
                <FormField
                  control={form.control}
                  name="licensingDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe your licensing plans</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="E.g., Will offer commercial licenses for $500, personal use licenses for $50, planning to use on Creative Market..."
                          rows={3}
                          {...field}
                          data-testid="textarea-licensing-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* NFT Plans */}
              <FormField
                control={form.control}
                name="planToMintNFT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">4. Do you plan to mint this as an NFT? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="nft-yes" data-testid="radio-nft-yes" />
                          <Label htmlFor="nft-yes" className="font-normal cursor-pointer">
                            Yes, I plan to mint this as NFT
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="nft-no" data-testid="radio-nft-no" />
                          <Label htmlFor="nft-no" className="font-normal cursor-pointer">
                            No, not planning to mint
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unsure" id="nft-unsure" data-testid="radio-nft-unsure" />
                          <Label htmlFor="nft-unsure" className="font-normal cursor-pointer">
                            Unsure / Considering options
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Intended Use */}
              <FormField
                control={form.control}
                name="intendedUse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">5. How do you plan to use this artwork? *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., Portfolio display, client projects, merchandise, social media branding, NFT marketplace..."
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

              {/* Portfolio URL */}
              <FormField
                control={form.control}
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio or Website URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://yourportfolio.com" 
                        {...field} 
                        data-testid="input-portfolio-url"
                      />
                    </FormControl>
                    <FormDescription>Where can people see your other work?</FormDescription>
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
              data-testid="button-submit-artwork-registration"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering Artwork...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Register Artwork
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Globe,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Link,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const platforms = [
  { value: "website", label: "Website", icon: Globe },
  { value: "twitter", label: "X (Twitter)", icon: Twitter },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "custom", label: "Custom Platform", icon: Link },
];

const usageTypes = [
  { value: "profile_logo", label: "Profile Logo" },
  { value: "banner", label: "Banner Image" },
  { value: "header", label: "Website Header" },
  { value: "footer", label: "Website Footer" },
  { value: "watermark", label: "Watermark" },
  { value: "favicon", label: "Favicon" },
  { value: "app_icon", label: "App Icon" },
];

const authorizedUsageSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  platformName: z.string().optional(),
  usageType: z.string().min(1, "Usage type is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
});

type AuthorizedUsageForm = z.infer<typeof authorizedUsageSchema>;

interface AuthorizedUsage {
  id: string;
  logoId: string;
  platform: string;
  platformName?: string;
  usageType: string;
  url: string;
  description?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Logo {
  id: string;
  fileName: string;
  description: string;
}

export default function AuthorizedUsagePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUsage, setEditingUsage] = useState<AuthorizedUsage | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<AuthorizedUsageForm>({
    resolver: zodResolver(authorizedUsageSchema),
    defaultValues: {
      platform: "",
      platformName: "",
      usageType: "",
      url: "",
      description: "",
    },
  });

  // Set page title
  useEffect(() => {
    document.title = "Authorized Usage - Solturio";
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to manage authorized usage locations",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch user's logos
  const { data: logos = [], isLoading: logosLoading } = useQuery<Logo[]>({
    queryKey: ["/api/logos"],
    enabled: isAuthenticated,
  });

  // Fetch authorized usages
  const { data: usages = [], isLoading: usagesLoading } = useQuery<AuthorizedUsage[]>({
    queryKey: selectedLogoId
      ? [`/api/logos/${selectedLogoId}/authorized-usage`]
      : ["/api/authorized-usages"],
    enabled: isAuthenticated,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AuthorizedUsageForm) => {
      if (!selectedLogoId) {
        throw new Error("Please select a logo first");
      }
      return apiRequest("POST", `/api/logos/${selectedLogoId}/authorized-usage`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: selectedLogoId
          ? [`/api/logos/${selectedLogoId}/authorized-usage`]
          : ["/api/authorized-usages"],
      });
      toast({
        title: "Success",
        description: "Authorized usage location added successfully",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AuthorizedUsageForm> }) => {
      return apiRequest("PATCH", `/api/authorized-usage/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: selectedLogoId
          ? [`/api/logos/${selectedLogoId}/authorized-usage`]
          : ["/api/authorized-usages"],
      });
      toast({
        title: "Success",
        description: "Authorized usage updated successfully",
      });
      setEditingUsage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/authorized-usage/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: selectedLogoId
          ? [`/api/logos/${selectedLogoId}/authorized-usage`]
          : ["/api/authorized-usages"],
      });
      toast({
        title: "Success",
        description: "Authorized usage removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AuthorizedUsageForm) => {
    if (editingUsage) {
      updateMutation.mutate({ id: editingUsage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const platformConfig = platforms.find((p) => p.value === platform);
    const Icon = platformConfig?.icon || Globe;
    return <Icon className="w-4 h-4" />;
  };

  const getUsageTypeLabel = (usageType: string) => {
    return usageTypes.find((t) => t.value === usageType)?.label || usageType;
  };

  if (authLoading || logosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Authorized Usage Locations</h1>
          <p className="text-muted-foreground">
            Register official places where your logos are being used (website headers, social media
            profiles, etc.) This helps establish authorized usage for IP protection.
          </p>
        </div>

        {logos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No logos uploaded yet</p>
              <p className="text-muted-foreground mb-4">
                Upload logos first before registering usage locations
              </p>
              <Button onClick={() => setLocation("/upload")}>Upload Logos</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Logo selector */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Logo</CardTitle>
                <CardDescription>
                  Choose which logo you want to manage authorized usage for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {logos.map((logo: Logo) => (
                    <div
                      key={logo.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLogoId === logo.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => setSelectedLogoId(logo.id)}
                      data-testid={`logo-selector-${logo.id}`}
                    >
                      <p className="font-medium text-sm truncate">{logo.fileName}</p>
                      {logo.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {logo.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedLogoId && (
              <>
                {/* Action buttons */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Registered Usage Locations</h2>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-usage">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Usage Location
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Authorized Usage Location</DialogTitle>
                        <DialogDescription>
                          Register where this logo is officially being used
                        </DialogDescription>
                      </DialogHeader>

                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="platform"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Platform</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-platform">
                                      <SelectValue placeholder="Select platform" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {platforms.map((platform) => (
                                      <SelectItem
                                        key={platform.value}
                                        value={platform.value}
                                        data-testid={`option-${platform.value}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <platform.icon className="w-4 h-4" />
                                          {platform.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {form.watch("platform") === "custom" && (
                            <FormField
                              control={form.control}
                              name="platformName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Platform Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., Discord, TikTok"
                                      {...field}
                                      data-testid="input-platform-name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="usageType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Usage Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-usage-type">
                                      <SelectValue placeholder="Select usage type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {usageTypes.map((type) => (
                                      <SelectItem
                                        key={type.value}
                                        value={type.value}
                                        data-testid={`option-${type.value}`}
                                      >
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Where specifically is the logo placed?
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL</FormLabel>
                                <FormControl>
                                  <Input
                                    type="url"
                                    placeholder="https://example.com/profile"
                                    {...field}
                                    data-testid="input-url"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Direct link to where the logo is displayed
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Additional notes about this usage..."
                                    className="resize-none"
                                    {...field}
                                    data-testid="textarea-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsAddDialogOpen(false);
                                form.reset();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createMutation.isPending}
                              data-testid="button-submit-usage"
                            >
                              {createMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              )}
                              Add Usage Location
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Usage list */}
                {usagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : usages.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Link className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold mb-2">No usage locations registered</p>
                      <p className="text-muted-foreground text-center mb-4">
                        Add authorized usage locations to track where your logo is officially used
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {usages.map((usage: AuthorizedUsage) => (
                      <Card key={usage.id} data-testid={`usage-card-${usage.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(usage.platform)}
                              <span className="font-semibold">
                                {usage.platformName ||
                                  platforms.find((p) => p.value === usage.platform)?.label ||
                                  usage.platform}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {usage.isVerified ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Unverified</Badge>
                              )}
                              {usage.isActive ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium">
                                {getUsageTypeLabel(usage.usageType)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">URL:</span>
                              <a
                                href={usage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <span className="truncate max-w-xs">{usage.url}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            {usage.description && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Notes:</span>
                                <p className="mt-1">{usage.description}</p>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Added: {new Date(usage.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUsage(usage);
                                form.reset({
                                  platform: usage.platform,
                                  platformName: usage.platformName,
                                  usageType: usage.usageType,
                                  url: usage.url,
                                  description: usage.description,
                                });
                              }}
                              data-testid={`button-edit-${usage.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (
                                  confirm("Are you sure you want to remove this authorized usage?")
                                ) {
                                  deleteMutation.mutate(usage.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${usage.id}`}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remove
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

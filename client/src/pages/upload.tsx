import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Upload as UploadIcon, X, Loader2, ArrowRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";

interface UploadedLogo {
  file?: File; // Optional for URL-based logos
  imageUrl?: string; // URL where image is hosted
  preview: string;
  description: string;
  ownershipDescription: string;
  intendedUse: string;
  copyrightStatus: 'none' | 'pre_filing' | 'pending' | 'registered';
  copyrightAppNumber: string;
  trademarkStatus: 'none' | 'pre_filing' | 'pending' | 'registered';
  trademarkAppNumber: string;
  patentStatus: 'none' | 'pre_filing' | 'pending' | 'registered';
  patentAppNumber: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export default function Upload() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [logos, setLogos] = useState<UploadedLogo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const queryClient = useQueryClient();

  // Set page title
  useEffect(() => {
    document.title = "Upload Logo - Solturio";
  }, []);

  // Redirect if not authenticated
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

  const extractImageMetadata = useCallback((file: File): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          format: file.type.split('/')[1].toUpperCase(),
          size: file.size,
        });
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newLogos: UploadedLogo[] = [];
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const preview = URL.createObjectURL(file);
      const metadata = await extractImageMetadata(file);

      newLogos.push({
        file,
        preview,
        description: '',
        ownershipDescription: '',
        intendedUse: '',
        copyrightStatus: 'none',
        copyrightAppNumber: '',
        trademarkStatus: 'none',
        trademarkAppNumber: '',
        patentStatus: 'none',
        patentAppNumber: '',
        metadata,
      });
    }

    setLogos(prev => [...prev, ...newLogos]);
  }, [toast, extractImageMetadata]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeLogo = useCallback((index: number) => {
    setLogos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const updateDescription = useCallback((index: number, description: string) => {
    if (description.length > 200) return;
    setLogos(prev => {
      const updated = [...prev];
      updated[index].description = description;
      return updated;
    });
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!companyName.trim()) {
        throw new Error('Please enter your company name');
      }

      const formData = new FormData();
      formData.append('companyName', companyName.trim());
      logos.forEach((logo, index) => {
        if (logo.file) {
          formData.append('logos', logo.file);
        } else if (logo.imageUrl) {
          // For URL-based logos, send the URL as a separate field
          formData.append(`imageUrl_${index}`, logo.imageUrl);
        }
        formData.append(`description_${index}`, logo.description);
        formData.append(`ownership_${index}`, logo.ownershipDescription);
        formData.append(`intended_use_${index}`, logo.intendedUse);
        formData.append(`copyright_status_${index}`, logo.copyrightStatus);
        formData.append(`copyright_app_${index}`, logo.copyrightAppNumber);
        formData.append(`trademark_status_${index}`, logo.trademarkStatus);
        formData.append(`trademark_app_${index}`, logo.trademarkAppNumber);
        formData.append(`patent_status_${index}`, logo.patentStatus);
        formData.append(`patent_app_${index}`, logo.patentAppNumber);
      });

      const response = await fetch('/api/logos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Logos uploaded successfully",
        description: `${logos.length} logo(s) uploaded. Continue to payment.`,
      });
      setLocation(`/checkout?collectionId=${data.collectionId}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b h-16 flex items-center px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover-elevate">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold">Solturio</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Register Logo Ownership</h1>
          <p className="text-muted-foreground">
            Register your logo metadata and ownership claims. Files will be stored in your personal .solturio.sol wallet.
          </p>
        </div>

        {/* Important Notice */}
        <Card className="p-4 mb-6 bg-blue-500/10 border-blue-500/20">
          <div className="flex gap-3">
            <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">How It Works</h3>
              <p className="text-sm text-muted-foreground">
                Solturio stores only JSON metadata with ownership claims, timestamps, and IP protection information.
                Your actual image files will be stored in your personal .solturio.sol wallet for complete control.
              </p>
            </div>
          </div>
        </Card>

        {/* Company Name Input */}
        <Card className="p-6 mb-8">
          <div className="max-w-md">
            <Label htmlFor="company-name" className="text-base font-semibold mb-2 block">
              Company Name *
            </Label>
            <Input
              id="company-name"
              placeholder="Enter your company or project name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mb-2"
              data-testid="input-company-name"
            />
            <p className="text-sm text-muted-foreground">
              This will be used to organize your logo collection
            </p>
          </div>
        </Card>

        {/* Upload Zone */}
        <Card
          className={`p-12 mb-8 border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <UploadIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Select logos to register
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload files to extract metadata and register ownership
            </p>
            <Input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <Label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span>Choose Files</span>
              </Button>
            </Label>
            <p className="text-xs text-muted-foreground mt-4">
              Supports PNG, JPG, SVG • Max 10MB per file
            </p>
          </div>
        </Card>

        {/* Or provide URL section */}
        <Card className="p-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Or Provide Image URL</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If your logo is already hosted online (e.g., in your .solturio.sol wallet or IPFS), provide the URL
            </p>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://your-wallet.solturio.sol/logo.png"
                className="flex-1"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                data-testid="input-image-url"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (imageUrlInput) {
                    // Add URL-based logo registration
                    const fileName = imageUrlInput.split('/').pop() || 'image.png';
                    setLogos(prev => [...prev, {
                      imageUrl: imageUrlInput,
                      preview: imageUrlInput,
                      description: '',
                      ownershipDescription: '',
                      intendedUse: '',
                      copyrightStatus: 'none',
                      copyrightAppNumber: '',
                      trademarkStatus: 'none',
                      trademarkAppNumber: '',
                      patentStatus: 'none',
                      patentAppNumber: '',
                      metadata: {
                        width: 0, // Will be determined by backend
                        height: 0,
                        format: fileName.split('.').pop()?.toUpperCase() || 'PNG',
                        size: 0,
                      }
                    }]);
                    
                    toast({
                      title: "URL Added",
                      description: `Added ${fileName} from URL`,
                    });
                    setImageUrlInput('');
                  }
                }}
                data-testid="button-add-url"
              >
                Add URL
              </Button>
            </div>
          </div>
        </Card>

        {/* Uploaded Logos Grid */}
        {logos.length > 0 && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-6">
                Uploaded Logos ({logos.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {logos.map((logo, index) => (
                  <Card key={index} className="p-4 relative" data-testid={`logo-card-${index}`}>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => removeLogo(index)}
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    
                    <div className="aspect-square mb-3 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      <img
                        src={logo.preview}
                        alt={logo.file?.name || 'Logo'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    <p className="text-sm font-medium truncate mb-2" title={logo.file?.name || logo.imageUrl}>
                      {logo.file?.name || (logo.imageUrl && logo.imageUrl.split('/').pop()) || 'Image'}
                    </p>
                    
                    {logo.metadata && (
                      <div className="text-xs text-muted-foreground mb-3 space-y-1">
                        <div>
                          {logo.metadata.width} × {logo.metadata.height}px
                        </div>
                        <div>
                          {logo.metadata.format} • {(logo.metadata.size / 1024).toFixed(1)}KB
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor={`desc-${index}`} className="text-xs mb-1">
                        Brief Description
                      </Label>
                      <Textarea
                        id={`desc-${index}`}
                        placeholder="Brief description..."
                        value={logo.description}
                        onChange={(e) => updateDescription(index, e.target.value)}
                        className="resize-none text-sm min-h-16"
                        data-testid={`input-description-${index}`}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between py-6 border-t">
              <Button variant="outline" onClick={() => setLogos([])} data-testid="button-clear-all">
                Clear All
              </Button>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending || logos.length === 0 || !companyName.trim()}
                className="gap-2"
                data-testid="button-continue-payment"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {logos.length === 0 && (
          <Card className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No logos uploaded yet</p>
          </Card>
        )}
      </main>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SolturioLicensingBadge, LicensingTermsDisplay, generateLicenseBadgeSVG } from '@/components/solturio-licensing-badge';
import { Download, Shield, FileText, Image, AlertCircle, Copy, CheckCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ArtworkLicensing() {
  const { toast } = useToast();
  const [selectedLogo, setSelectedLogo] = useState<string>('');
  const [licenseType, setLicenseType] = useState<'personal' | 'commercial' | 'exclusive' | 'nft'>('personal');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [badgePosition, setBadgePosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [badgeSize, setBadgeSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [badgeOpacity, setBadgeOpacity] = useState(0.8);
  const [includeQR, setIncludeQR] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [badgeStyle, setBadgeStyle] = useState<'minimal' | 'detailed' | 'premium' | 'invisible'>('detailed');
  const [colorTheme, setColorTheme] = useState<'light' | 'dark' | 'gold' | 'holographic'>('dark');
  const [customText, setCustomText] = useState('');
  
  // Fetch user's registered logos
  const { data: logos, isLoading } = useQuery<any[]>({
    queryKey: ['/api/logos']
  });

  const selectedLogoData = logos?.find((logo: any) => logo.id === selectedLogo);

  // Show empty state if user has no logos
  if (!isLoading && (!logos || logos.length === 0)) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <Shield className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2">No Artwork to License Yet</h1>
          <p className="text-lg text-muted-foreground mb-6">
            You need to register your logos and artwork first before you can create licensed versions.
          </p>
          <p className="text-muted-foreground mb-8">
            The Artwork Licensing feature allows you to embed transparent Solturio badges 
            into your work when selling or licensing it to clients, providing proof of authenticity 
            and registration.
          </p>
          <Button size="lg" asChild>
            <a href="/upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Artwork
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const handleGenerateLicensedArtwork = () => {
    if (!selectedLogoData || !buyerName || !buyerEmail) {
      toast({
        title: "Missing Information",
        description: "Please select artwork and provide buyer details",
        variant: "destructive"
      });
      return;
    }

    // Generate the SVG badge
    const badgeSVG = generateLicenseBadgeSVG({
      registrationId: selectedLogoData.id,
      artistName: selectedLogoData.creatorName || 'Artist',
      artworkTitle: selectedLogoData.title,
      licenseType,
      timestamp: selectedLogoData.createdAt
    });

    // Create download link for licensed version
    const blob = new Blob([badgeSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedLogoData.title}_licensed_${licenseType}.svg`;
    link.click();

    toast({
      title: "Licensed Artwork Generated",
      description: "The licensed version with embedded Solturio badge has been downloaded"
    });
  };

  const handleCopyLicenseInfo = () => {
    if (!selectedLogoData) return;
    
    const licenseInfo = `
SOLTURIO LICENSING CERTIFICATE
================================
Artwork: ${selectedLogoData.title}
Registration ID: ${selectedLogoData.id}
Artist: ${selectedLogoData.creatorName || 'Artist'}
License Type: ${licenseType.toUpperCase()}
Buyer: ${buyerName}
Date: ${new Date().toISOString().split('T')[0]}
Verification URL: ${window.location.origin}/verify/${selectedLogoData.id}
================================
This artwork is registered and protected on the Solturio blockchain platform.
    `.trim();
    
    navigator.clipboard.writeText(licenseInfo);
    toast({
      title: "Copied to Clipboard",
      description: "License information has been copied"
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Artwork Licensing & Sales</h1>
        <p className="text-lg text-muted-foreground">
          Apply transparent Solturio badges to your artwork when licensing or selling
        </p>
      </div>

      <Alert className="mb-6">
        <Shield className="w-4 h-4" />
        <AlertTitle>Protect Your Sales</AlertTitle>
        <AlertDescription>
          When you license or sell your artwork, embed our transparent Solturio badge to provide buyers with 
          proof of authenticity and registration. The badge includes your artist information, license type, 
          and a verification QR code that links back to your Solturio registration.
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Artwork</CardTitle>
              <CardDescription>Choose from your registered artworks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="artwork">Registered Artwork</Label>
                <Select value={selectedLogo} onValueChange={setSelectedLogo}>
                  <SelectTrigger id="artwork" data-testid="select-artwork">
                    <SelectValue placeholder="Select your artwork" />
                  </SelectTrigger>
                  <SelectContent>
                    {logos?.map((logo: any) => (
                      <SelectItem key={logo.id} value={logo.id}>
                        {logo.title} - #{logo.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLogoData && (
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-sm"><strong>Title:</strong> {selectedLogoData.title}</p>
                  <p className="text-sm"><strong>Registered:</strong> {new Date(selectedLogoData.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm font-mono"><strong>ID:</strong> #{selectedLogoData.id.slice(0, 8)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>License Details</CardTitle>
              <CardDescription>Configure the license for this sale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="license">License Type</Label>
                <Select value={licenseType} onValueChange={(v: any) => setLicenseType(v)}>
                  <SelectTrigger id="license" data-testid="select-license">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Use License</SelectItem>
                    <SelectItem value="commercial">Commercial License</SelectItem>
                    <SelectItem value="exclusive">Exclusive License</SelectItem>
                    <SelectItem value="nft">NFT Ownership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buyer">Buyer Name</Label>
                <Input 
                  id="buyer"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter buyer's name"
                  data-testid="input-buyer-name"
                />
              </div>

              <div>
                <Label htmlFor="email">Buyer Email</Label>
                <Input 
                  id="email"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  data-testid="input-buyer-email"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badge Settings</CardTitle>
              <CardDescription>Customize the embedded badge appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Select value={badgePosition} onValueChange={(v: any) => setBadgePosition(v)}>
                    <SelectTrigger id="position" data-testid="select-position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="size">Size</Label>
                  <Select value={badgeSize} onValueChange={(v: any) => setBadgeSize(v)}>
                    <SelectTrigger id="size" data-testid="select-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="opacity">Opacity: {Math.round(badgeOpacity * 100)}%</Label>
                <input
                  id="opacity"
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.1"
                  value={badgeOpacity}
                  onChange={(e) => setBadgeOpacity(parseFloat(e.target.value))}
                  className="w-full"
                  data-testid="slider-opacity"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="qr"
                  type="checkbox"
                  checked={includeQR}
                  onChange={(e) => setIncludeQR(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-qr"
                />
                <Label htmlFor="qr">Include QR verification code</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how the badge will appear on your artwork</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted rounded-lg aspect-square flex items-center justify-center">
                {selectedLogoData ? (
                  <>
                    <Image className="w-32 h-32 text-muted-foreground" />
                    <SolturioLicensingBadge
                      registrationId={selectedLogoData.id}
                      artistName={selectedLogoData.creatorName || 'Artist Name'}
                      artworkTitle={selectedLogoData.title}
                      licenseType={licenseType}
                      timestamp={selectedLogoData.createdAt}
                      isVerified={true}
                      position={badgePosition}
                      size={badgeSize}
                      opacity={badgeOpacity}
                      includeQR={includeQR}
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground">Select artwork to preview</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>License Terms</CardTitle>
              <CardDescription>What this license includes</CardDescription>
            </CardHeader>
            <CardContent>
              <LicensingTermsDisplay licenseType={licenseType} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Generate licensed artwork with embedded badge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleGenerateLicensedArtwork}
                className="w-full gap-2"
                disabled={!selectedLogoData || !buyerName || !buyerEmail}
                data-testid="button-generate"
              >
                <Download className="w-4 h-4" />
                Generate Licensed Artwork
              </Button>
              
              <Button 
                onClick={handleCopyLicenseInfo}
                variant="outline"
                className="w-full gap-2"
                disabled={!selectedLogoData}
                data-testid="button-copy"
              >
                <Copy className="w-4 h-4" />
                Copy License Certificate
              </Button>

              <Button 
                variant="outline"
                className="w-full gap-2"
                disabled={!selectedLogoData}
                asChild
                data-testid="button-view"
              >
                <a href={`/verify/${selectedLogoData?.id}`} target="_blank">
                  <FileText className="w-4 h-4" />
                  View Verification Page
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Alert className="mt-6">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>How It Works</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Select your registered artwork from the dropdown</li>
            <li>Choose the appropriate license type for this sale</li>
            <li>Enter buyer information for the certificate</li>
            <li>Customize badge appearance (position, size, opacity)</li>
            <li>Generate the licensed version with embedded Solturio badge</li>
            <li>Send both the licensed artwork and certificate to your buyer</li>
          </ol>
          <p className="mt-3">
            The embedded badge proves authenticity and allows buyers to verify their license 
            by scanning the QR code or visiting the verification URL.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
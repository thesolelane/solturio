import { useEffect } from "react";
import { Link } from "wouter";
import { Shield, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page Not Found - LogoGuard";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="p-12 text-center max-w-md">
        <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="gap-2" data-testid="button-go-home">
          <Link href="/">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </Button>
      </Card>
    </div>
  );
}

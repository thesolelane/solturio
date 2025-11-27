import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Github, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Link as LinkIcon,
  Code,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  parseInstructionFromUrl, 
  getInstructionDescription,
  type OnChainInstruction 
} from "@/lib/transaction-builder";

interface GitHubLinkProps {
  walletAddress?: string;
}

interface GitHubStatus {
  configured: boolean;
  circuitBreaker: {
    isOpen: boolean;
    failures: number;
  };
  available: boolean;
}

interface LinkStatus {
  success: boolean;
  linked: boolean;
  githubUsername?: string;
  repositories?: Array<{
    name: string;
    url: string;
    registeredAt: string;
  }>;
}

export function GitHubLink({ walletAddress }: GitHubLinkProps) {
  const { toast } = useToast();
  const [pendingInstruction, setPendingInstruction] = useState<OnChainInstruction | null>(null);

  useEffect(() => {
    const instruction = parseInstructionFromUrl();
    if (instruction) {
      setPendingInstruction(instruction);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("github_linked") === "true") {
      toast({
        title: "GitHub Connected",
        description: "Your GitHub account has been linked successfully.",
      });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/github/link-status"] });
    }

    const error = params.get("error");
    if (error) {
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const { data: status, isLoading: statusLoading } = useQuery<GitHubStatus>({
    queryKey: ["/api/github/status"],
    refetchInterval: 30000,
  });

  const linkStatusQueryKey = walletAddress 
    ? ["/api/github/link-status", walletAddress] 
    : ["/api/github/link-status"];

  const { data: linkStatus, isLoading: linkLoading } = useQuery<LinkStatus>({
    queryKey: linkStatusQueryKey,
    enabled: !!walletAddress && status?.available,
  });

  const startOAuthMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/github/oauth/start";
    },
  });

  const linkWalletMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/github/link-wallet", "POST", { walletAddress });
    },
    onSuccess: (data: any) => {
      if (data.onChain) {
        setPendingInstruction(data.onChain.instruction);
        toast({
          title: "Signature Required",
          description: "Please sign the transaction to complete linking.",
        });
      } else {
        toast({
          title: "Wallet Linked",
          description: "Your wallet has been linked to your GitHub account.",
        });
        queryClient.invalidateQueries({ queryKey: linkStatusQueryKey });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Link Failed",
        description: error.message || "Failed to link wallet",
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-3">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              GitHub integration is not configured. Contact support if you need this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status.available) {
    return (
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-3">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub Integration</CardTitle>
            <Badge variant="destructive">Unavailable</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              GitHub service is temporarily unavailable. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center gap-3">
          <Github className="h-5 w-5" />
          <CardTitle>GitHub Integration</CardTitle>
          {linkStatus?.linked && (
            <Badge variant="outline" className="ml-auto">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingInstruction && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Transaction Pending</p>
              <p className="text-sm text-muted-foreground">
                {getInstructionDescription(pendingInstruction.instruction)}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingInstruction.note}
              </p>
              {pendingInstruction.requiresDualSignature && (
                <Badge variant="secondary" className="mt-2">
                  Requires wallet signature
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!linkStatus?.linked ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to register code repositories and prove ownership of your projects.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => startOAuthMutation.mutate()}
                disabled={startOAuthMutation.isPending}
                data-testid="button-github-connect"
              >
                {startOAuthMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Github className="h-4 w-4 mr-2" />
                )}
                Connect GitHub Account
              </Button>

              {walletAddress && (
                <Button
                  variant="outline"
                  onClick={() => linkWalletMutation.mutate()}
                  disabled={linkWalletMutation.isPending}
                  data-testid="button-github-link-wallet"
                >
                  {linkWalletMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-2" />
                  )}
                  Link Wallet to GitHub
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              <span className="font-medium">{linkStatus.githubUsername}</span>
              <Badge variant="secondary">Verified</Badge>
            </div>

            {linkStatus.repositories && linkStatus.repositories.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Registered Repositories
                  </h4>
                  <div className="space-y-2">
                    {linkStatus.repositories.map((repo, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        data-testid={`repo-item-${idx}`}
                      >
                        <span className="text-sm">{repo.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(repo.registeredAt).toLocaleDateString()}
                          </span>
                          <a 
                            href={repo.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/api/github/oauth/start", "_self")}
              data-testid="button-github-reconnect"
            >
              <Github className="h-4 w-4 mr-2" />
              Reconnect Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

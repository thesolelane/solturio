import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  HardDrive,
  Cloud,
  Globe,
  Infinity,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export type StorageType = "ipfs" | "arweave" | "both";

interface StorageOption {
  id: StorageType;
  name: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  cost: string;
  persistence: string;
}

const storageOptions: StorageOption[] = [
  {
    id: "ipfs",
    name: "IPFS (InterPlanetary File System)",
    description: "Decentralized storage with content addressing",
    features: [
      "Fast retrieval through global gateways",
      "Content-addressed (CID) for deduplication",
      "Pinned storage via Pinata",
      "Best for frequently accessed files",
    ],
    icon: Globe,
    cost: "Low cost",
    persistence: "Pinned (renewable)",
  },
  {
    id: "arweave",
    name: "Arweave",
    description: "Permanent storage with one-time payment",
    features: [
      "Permanent storage (200+ years)",
      "One-time payment model",
      "Blockchain-based proof",
      "Best for archival & legal records",
    ],
    icon: Infinity,
    cost: "Higher upfront cost",
    persistence: "Permanent",
  },
  {
    id: "both",
    name: "Both (Recommended)",
    description: "Store on both networks for maximum redundancy",
    features: [
      "IPFS for fast access",
      "Arweave for permanent archival",
      "Maximum redundancy",
      "Best protection for IP claims",
    ],
    icon: HardDrive,
    cost: "Combined cost",
    persistence: "Permanent + Fast",
  },
];

interface StorageSelectorProps {
  value: StorageType;
  onChange: (value: StorageType) => void;
  fileSize?: number;
}

export function StorageSelector({ value, onChange, fileSize }: StorageSelectorProps) {
  const [estimatedCost, setEstimatedCost] = useState<{ ar?: string; usd?: string } | null>(null);

  // Check storage service status
  const { data: storageStatus, isLoading } = useQuery({
    queryKey: ["/api/storage/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Estimate Arweave cost if file size is provided
  useEffect(() => {
    if (fileSize && fileSize > 0 && (value === "arweave" || value === "both")) {
      fetch("/api/storage/arweave/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSize: fileSize }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.estimatedCost) {
            setEstimatedCost({
              ar: data.estimatedCost,
              usd: (parseFloat(data.estimatedCost) * 10).toFixed(2), // Rough AR to USD conversion
            });
          }
        })
        .catch(console.error);
    }
  }, [fileSize, value]);

  const renderStorageOption = (option: StorageOption) => {
    const isSelected = value === option.id;
    const Icon = option.icon;

    // Check if service is configured
    let isConfigured = true;
    let statusMessage = "";

    if (storageStatus) {
      if (option.id === "ipfs") {
        isConfigured = storageStatus.ipfs?.configured && storageStatus.ipfs?.authenticated;
        statusMessage = isConfigured ? "Ready" : "Not configured";
      } else if (option.id === "arweave") {
        isConfigured = storageStatus.arweave?.configured;
        statusMessage = isConfigured
          ? `Balance: ${storageStatus.arweave.balance || "0"} AR`
          : "Not configured";
      } else if (option.id === "both") {
        const ipfsReady = storageStatus.ipfs?.configured && storageStatus.ipfs?.authenticated;
        const arweaveReady = storageStatus.arweave?.configured;
        isConfigured = ipfsReady && arweaveReady;
        statusMessage = isConfigured ? "Both services ready" : "Some services not configured";
      }
    }

    return (
      <div className="relative">
        <RadioGroupItem
          value={option.id}
          id={option.id}
          className="peer sr-only"
          disabled={!isConfigured}
        />
        <Label
          htmlFor={option.id}
          className={`
            flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all
            ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/50"
            }
            ${!isConfigured ? "opacity-50 cursor-not-allowed" : ""}
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`
                p-2 rounded-lg
                ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}
              `}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-base">{option.name}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </div>
            </div>
            {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <DollarSign className="w-3 h-3" />
                {option.cost}
              </Badge>
              <Badge variant="outline">{option.persistence}</Badge>
              {isConfigured ? (
                <Badge variant="outline" className="gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  {statusMessage}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-yellow-600">
                  <AlertCircle className="w-3 h-3" />
                  {statusMessage}
                </Badge>
              )}
            </div>

            <ul className="space-y-1">
              {option.features.map((feature, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </Label>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={value} onValueChange={(v) => onChange(v as StorageType)}>
        <div className="grid gap-4">{storageOptions.map(renderStorageOption)}</div>
      </RadioGroup>

      {estimatedCost && (value === "arweave" || value === "both") && (
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            Estimated Arweave cost: {estimatedCost.ar} AR (≈ ${estimatedCost.usd} USD)
            {value === "both" && " + IPFS pinning fees"}
          </AlertDescription>
        </Alert>
      )}

      {storageStatus && (!storageStatus.ipfs?.configured || !storageStatus.arweave?.configured) && (
        <Alert className="border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Storage Configuration Required</p>
              <p className="text-sm">To use decentralized storage, you need to configure:</p>
              <ul className="text-sm space-y-1 ml-4">
                {!storageStatus.ipfs?.configured && (
                  <li>• IPFS: Add PINATA_API_KEY and PINATA_SECRET_KEY</li>
                )}
                {!storageStatus.arweave?.configured && <li>• Arweave: Add ARWEAVE_WALLET_KEY</li>}
              </ul>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" asChild>
                  <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Get Pinata API
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href="https://www.arweave.org/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Get Arweave Wallet
                  </a>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

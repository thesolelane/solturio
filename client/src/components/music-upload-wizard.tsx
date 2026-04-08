import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, uploadFormData } from "@/lib/queryClient";
import { Upload, Music2, Disc3, CheckCircle2 } from "lucide-react";

interface MusicUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  releaseId?: string;
  releaseTitle?: string;
  releaseType?: string;
}

type Step = "file" | "mode" | "release" | "uploading" | "success";

export default function MusicUploadWizard({
  open,
  onOpenChange,
  collectionId,
  releaseId,
  releaseTitle,
  releaseType,
}: MusicUploadWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"standalone" | "part_of_release">(
    releaseId ? "part_of_release" : "standalone"
  );
  const [newReleaseType, setNewReleaseType] = useState(releaseType || "single");
  const [newReleaseTitle, setNewReleaseTitle] = useState(releaseTitle || "");
  const [trackNumber, setTrackNumber] = useState("1");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const resetWizard = useCallback(() => {
    setStep("file");
    setFile(null);
    setTitle("");
    setMode(releaseId ? "part_of_release" : "standalone");
    setNewReleaseType(releaseType || "single");
    setNewReleaseTitle(releaseTitle || "");
    setTrackNumber("1");
    setUploadProgress(0);
    setResult(null);
  }, [releaseId, releaseType, releaseTitle]);

  const handleClose = (open: boolean) => {
    if (!open) {
      resetWizard();
    }
    onOpenChange(open);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("collectionId", collectionId);
      formData.append("title", title || file.name.replace(/\.[^/.]+$/, ""));
      formData.append("mode", mode);

      if (mode === "part_of_release") {
        formData.append("releaseType", releaseId ? releaseType || "album" : newReleaseType);
        formData.append("releaseTitle", releaseId ? releaseTitle || "" : newReleaseTitle);
        formData.append("trackNumber", trackNumber);
        if (releaseId) {
          formData.append("releaseId", releaseId);
        }
      }

      setStep("uploading");
      setUploadProgress(10);

      const response = await uploadFormData("/api/music/upload", formData);

      setUploadProgress(80);

      const data = await response.json();
      setUploadProgress(100);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("success");
      queryClient.invalidateQueries({
        queryKey: ["/api/music/collections", collectionId, "tracks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/music/collections", collectionId, "releases"],
      });
      if (releaseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/music/releases", releaseId] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setStep("file");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files?.[0];
      if (dropped && dropped.type.startsWith("audio/")) {
        setFile(dropped);
        if (!title) {
          setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
        }
      }
    },
    [title]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const canProceedFromFile = file && title.trim();
  const canProceedFromMode = mode === "standalone" || (newReleaseTitle.trim() && newReleaseType);

  const handleNext = () => {
    if (step === "file" && canProceedFromFile) {
      if (releaseId) {
        uploadMutation.mutate();
      } else {
        setStep("mode");
      }
    } else if (step === "mode") {
      if (mode === "standalone") {
        uploadMutation.mutate();
      } else {
        setStep("release");
      }
    } else if (step === "release" && canProceedFromMode) {
      uploadMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            {step === "success" ? "Upload Complete" : "Upload Track"}
          </DialogTitle>
        </DialogHeader>

        {step === "file" && (
          <div className="space-y-4 pt-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById("audio-file-input")?.click()}
              data-testid="dropzone-audio"
            >
              <input
                id="audio-file-input"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
                data-testid="input-audio-file"
              />
              {file ? (
                <div className="space-y-2">
                  <Music2 className="w-12 h-12 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Drop audio file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse (MP3, WAV, FLAC, AAC)
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="track-title">Track Title</Label>
              <Input
                id="track-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter track title"
                data-testid="input-track-title"
              />
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceedFromFile}
              className="w-full"
              data-testid="button-next-step"
            >
              {releaseId ? "Upload to Release" : "Next: Choose Mode"}
            </Button>
          </div>
        )}

        {step === "mode" && (
          <div className="space-y-6 pt-4">
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <div
                className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => setMode("standalone")}
              >
                <RadioGroupItem value="standalone" id="standalone" data-testid="radio-standalone" />
                <div>
                  <Label htmlFor="standalone" className="font-medium cursor-pointer">
                    Standalone Single
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Release as an independent single track
                  </p>
                </div>
              </div>
              <div
                className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => setMode("part_of_release")}
              >
                <RadioGroupItem
                  value="part_of_release"
                  id="part_of_release"
                  data-testid="radio-part-of-release"
                />
                <div>
                  <Label htmlFor="part_of_release" className="font-medium cursor-pointer">
                    Part of EP/Album
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Add to an EP, Album, or Compilation
                  </p>
                </div>
              </div>
            </RadioGroup>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("file")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1" data-testid="button-continue">
                {mode === "standalone" ? "Upload" : "Next: Release Details"}
              </Button>
            </div>
          </div>
        )}

        {step === "release" && (
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="release-type">Release Type</Label>
              <Select value={newReleaseType} onValueChange={setNewReleaseType}>
                <SelectTrigger data-testid="select-release-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="ep">EP</SelectItem>
                  <SelectItem value="album">Album</SelectItem>
                  <SelectItem value="compilation">Compilation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="release-title">Release Title</Label>
              <Input
                id="release-title"
                value={newReleaseTitle}
                onChange={(e) => setNewReleaseTitle(e.target.value)}
                placeholder="Album or EP name"
                data-testid="input-release-title"
              />
            </div>

            <div>
              <Label htmlFor="track-number">Track Number</Label>
              <Input
                id="track-number"
                type="number"
                min="1"
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                placeholder="1"
                data-testid="input-track-number"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("mode")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromMode}
                className="flex-1"
                data-testid="button-upload"
              >
                Upload Track
              </Button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="space-y-4 pt-8 pb-4 text-center">
            <Music2 className="w-16 h-16 mx-auto text-primary animate-pulse" />
            <p className="font-medium">Uploading and processing...</p>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {uploadProgress < 30 && "Computing audio hash..."}
              {uploadProgress >= 30 && uploadProgress < 60 && "Encrypting master audio..."}
              {uploadProgress >= 60 &&
                uploadProgress < 90 &&
                "Uploading to decentralized storage..."}
              {uploadProgress >= 90 && "Finalizing..."}
            </p>
          </div>
        )}

        {step === "success" && result && (
          <div className="space-y-4 pt-4 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <p className="font-medium text-lg">Track uploaded successfully!</p>

            <div className="text-left bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audio Hash:</span>
                <span className="font-mono text-xs truncate max-w-48">{result.audioHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context Hash:</span>
                <span className="font-mono text-xs truncate max-w-48">{result.contextHash}</span>
              </div>
            </div>

            <Button onClick={() => handleClose(false)} className="w-full" data-testid="button-done">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

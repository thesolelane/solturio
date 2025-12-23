import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Music2, Play, Pause, Shield, FileText, 
  Clock, Disc3, Hash, Volume2, VolumeX
} from "lucide-react";
import type { Track } from "@shared/schema";

export default function MusicTrackDetail() {
  const { id } = useParams<{ id: string }>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const { data: track, isLoading } = useQuery<Track>({
    queryKey: ["/api/music/tracks", id],
  });

  const togglePlay = () => {
    if (!audioRef.current || !track?.previewUri) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(pct);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "--:--";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-8">
          <Skeleton className="w-48 h-48 rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Track not found</h1>
        <Link href="/music">
          <Button variant="outline" className="mt-4">Back to Music</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-6 py-12">
      <Link href={track.collectionId ? `/music/collections/${track.collectionId}` : "/music"}>
        <Button variant="ghost" className="mb-4" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <div className="w-48 h-48 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {track.coverUri ? (
            <img src={track.coverUri} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <Music2 className="w-16 h-16 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-semibold" data-testid="text-track-title">{track.title}</h1>
          <p className="text-xl text-muted-foreground mt-1">{track.artistName}</p>
          {track.featuredArtists && track.featuredArtists.length > 0 && (
            <p className="text-sm text-muted-foreground">
              feat. {track.featuredArtists.join(", ")}
            </p>
          )}

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatDuration(track.durationMs ?? undefined)}
            </div>
            {track.isExplicit && <Badge variant="outline">Explicit</Badge>}
            {track.nftAddress && (
              <Badge variant="secondary">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {track.previewUri && track.previewUri !== "ar://PREVIEW_TX" && (
            <div className="mt-6 space-y-2">
              <audio
                ref={audioRef}
                src={track.previewUri}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
              <div className="flex items-center gap-4">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={togglePlay}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Progress value={progress} className="flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  data-testid="button-mute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Link href={`/create-license?assetId=${track.assetId || track.id}&assetType=track`}>
              <Button data-testid="button-create-license">
                <FileText className="w-4 h-4 mr-2" />
                Create License
              </Button>
            </Link>
            {!track.nftAddress && (
              <Button variant="outline" data-testid="button-mint-track">
                <Shield className="w-4 h-4 mr-2" />
                Mint NFT
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {track.audioHashSha256 && (
              <div>
                <span className="text-muted-foreground">Audio Hash:</span>
                <p className="font-mono text-xs break-all">{track.audioHashSha256}</p>
              </div>
            )}
            {track.contextHashSha256 && (
              <div>
                <span className="text-muted-foreground">Context Hash:</span>
                <p className="font-mono text-xs break-all">{track.contextHashSha256}</p>
              </div>
            )}
            {track.sampleRate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample Rate:</span>
                <span>{track.sampleRate} Hz</span>
              </div>
            )}
            {track.bitDepth && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bit Depth:</span>
                <span>{track.bitDepth}-bit</span>
              </div>
            )}
            {track.channels && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channels:</span>
                <span>{track.channels === 2 ? "Stereo" : track.channels === 1 ? "Mono" : track.channels}</span>
              </div>
            )}
            {track.bpm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">BPM:</span>
                <span>{track.bpm}</span>
              </div>
            )}
            {track.key && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key:</span>
                <span>{track.key}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Disc3 className="w-5 h-5" />
              Rights & Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {track.isrc && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ISRC:</span>
                <span className="font-mono">{track.isrc}</span>
              </div>
            )}
            {track.iswc && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ISWC:</span>
                <span className="font-mono">{track.iswc}</span>
              </div>
            )}
            {track.publisherName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Publisher:</span>
                <span>{track.publisherName}</span>
              </div>
            )}
            {track.registrationType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{track.registrationType}</Badge>
              </div>
            )}
            {track.registeredAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered:</span>
                <span>{new Date(track.registeredAt).toLocaleDateString()}</span>
              </div>
            )}
            {track.nftAddress && (
              <div>
                <span className="text-muted-foreground">NFT Address:</span>
                <p className="font-mono text-xs break-all">{track.nftAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

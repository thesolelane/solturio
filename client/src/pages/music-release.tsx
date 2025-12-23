import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Disc3, Play, Clock, Upload, Shield, ChevronRight } from "lucide-react";
import MusicUploadWizard from "../components/music-upload-wizard";
import type { Release, Track } from "@shared/schema";

interface ReleaseWithTracks extends Release {
  tracks?: Array<Track & { trackNumber: number; discNumber: number }>;
}

export default function MusicReleaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: release, isLoading } = useQuery<ReleaseWithTracks>({
    queryKey: ["/api/music/releases", id],
  });

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-8">
          <Skeleton className="w-64 h-64 rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Release not found</h1>
        <Link href="/music">
          <Button variant="outline" className="mt-4">Back to Music</Button>
        </Link>
      </div>
    );
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return "--:--";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = release.tracks?.reduce((sum, t) => sum + (t.durationMs || 0), 0) || 0;

  return (
    <div className="container max-w-7xl mx-auto px-6 py-12">
      <Link href={`/music/collections/${release.collectionId}`}>
        <Button variant="ghost" className="mb-4" data-testid="button-back-collection">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collection
        </Button>
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <div className="w-64 h-64 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {release.coverArtUri ? (
            <img src={release.coverArtUri} alt={release.title} className="w-full h-full object-cover" />
          ) : (
            <Disc3 className="w-24 h-24 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1">
          <Badge className="mb-2">{release.releaseType?.toUpperCase()}</Badge>
          <h1 className="text-3xl font-semibold" data-testid="text-release-title">{release.title}</h1>
          <p className="text-xl text-muted-foreground mt-1">{release.artistName}</p>

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            {release.releaseDate && (
              <span>{new Date(release.releaseDate).getFullYear()}</span>
            )}
            <span>{release.tracks?.length || 0} tracks</span>
            <span>{formatDuration(totalDuration)}</span>
            {release.genre && <Badge variant="outline">{release.genre}</Badge>}
          </div>

          <Separator className="my-6" />

          <div className="flex flex-wrap gap-2">
            {release.upc && (
              <Badge variant="secondary" className="font-mono text-xs">UPC: {release.upc}</Badge>
            )}
            {release.catalogNumber && (
              <Badge variant="secondary" className="font-mono text-xs">CAT: {release.catalogNumber}</Badge>
            )}
            {release.nftAddress && (
              <Badge variant="secondary">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={() => setUploadOpen(true)} data-testid="button-add-track">
              <Upload className="w-4 h-4 mr-2" />
              Add Track
            </Button>
            {!release.nftAddress && (
              <Button variant="outline" data-testid="button-mint-release">
                <Shield className="w-4 h-4 mr-2" />
                Mint Release NFT
              </Button>
            )}
          </div>

          {release.copyrightLine && (
            <p className="text-xs text-muted-foreground mt-6">{release.copyrightLine}</p>
          )}
          {release.productionLine && (
            <p className="text-xs text-muted-foreground">{release.productionLine}</p>
          )}
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Tracklist</h2>

      {!release.tracks || release.tracks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Disc3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
            <p className="text-muted-foreground mb-4">Add tracks to this release</p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Track
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {release.tracks
            .sort((a, b) => (a.discNumber || 1) * 100 + a.trackNumber - ((b.discNumber || 1) * 100 + b.trackNumber))
            .map((track) => (
              <Link key={track.id} href={`/music/tracks/${track.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-track-${track.id}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="text-sm text-muted-foreground w-8">
                      {track.discNumber && track.discNumber > 1 ? `${track.discNumber}-` : ""}
                      {track.trackNumber}
                    </span>
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{track.artistName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDuration(track.durationMs ?? undefined)}
                    </div>
                    {track.isExplicit && <Badge variant="outline">E</Badge>}
                    {track.nftAddress && <Badge variant="secondary">Minted</Badge>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      )}

      <MusicUploadWizard
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        collectionId={release.collectionId || ""}
        releaseId={id}
        releaseTitle={release.title}
        releaseType={release.releaseType || "album"}
      />
    </div>
  );
}

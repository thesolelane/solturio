import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Disc3, Music2, Upload, ChevronRight, Play, Clock } from "lucide-react";
import MusicUploadWizard from "../components/music-upload-wizard";
import type { MusicCollection, Release, Track } from "@shared/schema";

export default function MusicCollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: collection, isLoading: loadingCollection } = useQuery<MusicCollection>({
    queryKey: ["/api/music/collections", id],
  });

  const { data: releases, isLoading: loadingReleases } = useQuery<Release[]>({
    queryKey: ["/api/music/collections", id, "releases"],
  });

  const { data: tracks, isLoading: loadingTracks } = useQuery<Track[]>({
    queryKey: ["/api/music/collections", id, "tracks"],
  });

  if (loadingCollection) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-96 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Collection not found</h1>
        <Link href="/music">
          <Button variant="outline" className="mt-4">
            Back to Collections
          </Button>
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

  return (
    <div className="container max-w-7xl mx-auto px-6 py-12">
      <Link href="/music">
        <Button variant="ghost" className="mb-4" data-testid="button-back-collections">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collections
        </Button>
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center">
            {collection.coverArtUri ? (
              <img
                src={collection.coverArtUri}
                alt={collection.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Disc3 className="w-12 h-12 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-collection-name">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground mt-1">{collection.description}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary">{collection.labelName || "Independent"}</Badge>
              <Badge variant="outline">{releases?.length || 0} Releases</Badge>
              <Badge variant="outline">{tracks?.length || 0} Tracks</Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => setUploadOpen(true)} data-testid="button-upload-track">
          <Upload className="w-4 h-4 mr-2" />
          Upload Track
        </Button>
      </div>

      <Tabs defaultValue="releases" className="w-full">
        <TabsList>
          <TabsTrigger value="releases" data-testid="tab-releases">
            <Disc3 className="w-4 h-4 mr-2" />
            Releases
          </TabsTrigger>
          <TabsTrigger value="tracks" data-testid="tab-tracks">
            <Music2 className="w-4 h-4 mr-2" />
            All Tracks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="releases" className="mt-6">
          {loadingReleases ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !releases || releases.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Disc3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No releases yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload tracks and organize them into releases
                </p>
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Track
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {releases.map((release) => (
                <Link key={release.id} href={`/music/releases/${release.id}`}>
                  <Card
                    className="hover-elevate cursor-pointer h-full"
                    data-testid={`card-release-${release.id}`}
                  >
                    <CardHeader>
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-4 overflow-hidden">
                        {release.coverArtUri ? (
                          <img
                            src={release.coverArtUri}
                            alt={release.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Disc3 className="w-16 h-16 text-muted-foreground" />
                        )}
                      </div>
                      <CardTitle className="line-clamp-1">{release.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{release.artistName}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge>{release.releaseType?.toUpperCase()}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracks" className="mt-6">
          {loadingTracks ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !tracks || tracks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start uploading music to protect your audio IP
                </p>
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Track
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <Link key={track.id} href={`/music/tracks/${track.id}`}>
                  <Card
                    className="hover-elevate cursor-pointer"
                    data-testid={`card-track-${track.id}`}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <span className="text-sm text-muted-foreground w-8">{index + 1}</span>
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
                      {track.nftAddress && <Badge variant="secondary">Minted</Badge>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MusicUploadWizard open={uploadOpen} onOpenChange={setUploadOpen} collectionId={id!} />
    </div>
  );
}

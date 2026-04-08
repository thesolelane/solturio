import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Music, Plus, Disc3, Library, ChevronRight } from "lucide-react";
import type { MusicCollection } from "@shared/schema";

export default function MusicCollections() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");

  const { data: collections, isLoading } = useQuery<MusicCollection[]>({
    queryKey: ["/api/music/collections"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/music/collections", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/music/collections"] });
      setCreateOpen(false);
      setNewCollectionName("");
      setNewCollectionDesc("");
      toast({
        title: "Collection created",
        description: "Your music collection has been created.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newCollectionName.trim()) return;
    createMutation.mutate({ name: newCollectionName, description: newCollectionDesc });
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Library className="w-8 h-8" />
            Music Collections
          </h1>
          <p className="text-muted-foreground mt-2">
            Organize and protect your music IP with blockchain verification
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-collection">
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Music Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="collection-name">Collection Name</Label>
                <Input
                  id="collection-name"
                  data-testid="input-collection-name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="My Album Collection"
                />
              </div>
              <div>
                <Label htmlFor="collection-desc">Description (optional)</Label>
                <Textarea
                  id="collection-desc"
                  data-testid="input-collection-description"
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="Describe your collection..."
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newCollectionName.trim() || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-collection"
              >
                {createMutation.isPending ? "Creating..." : "Create Collection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!collections || collections.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No collections yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first music collection to start protecting your audio IP
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="button-create-first-collection"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/music/collections/${collection.id}`}>
              <Card
                className="hover-elevate cursor-pointer h-full"
                data-testid={`card-collection-${collection.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Disc3 className="w-6 h-6 text-primary" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4">{collection.name}</CardTitle>
                  {collection.description && (
                    <CardDescription className="line-clamp-2">
                      {collection.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{collection.labelName || "Independent"}</Badge>
                    {collection.status === "active" && <Badge variant="outline">Active</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

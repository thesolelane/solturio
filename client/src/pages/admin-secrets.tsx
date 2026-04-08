import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KeyRound, Eye, EyeOff, Pencil, Trash2, Plus, Lock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

interface SecretRow {
  id: string;
  name: string;
  createdAt: string | null;
}

export default function AdminSecrets() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [loadingReveal, setLoadingReveal] = useState<Record<string, boolean>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addValue, setAddValue] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Secrets Vault - Admin - Solturio";
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.email) {
      const adminAccess = ADMIN_EMAILS.includes(user.email.toLowerCase());
      setIsAdmin(adminAccess);
      if (!adminAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    } else if (!authLoading && !isAuthenticated) {
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  const { data: secrets, isLoading: secretsLoading } = useQuery<SecretRow[]>({
    queryKey: ["/api/admin/secrets"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; value: string }) => {
      return apiRequest("POST", "/api/admin/secrets", data);
    },
    onSuccess: () => {
      toast({ title: "Secret Added", description: "The secret has been encrypted and stored." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/secrets"] });
      setAddOpen(false);
      setAddName("");
      setAddValue("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Secret",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; value: string }) => {
      return apiRequest("PATCH", `/api/admin/secrets/${data.id}`, {
        name: data.name,
        value: data.value,
      });
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Secret Updated", description: "The secret has been re-encrypted and saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/secrets"] });
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      setEditOpen(false);
      setEditId("");
      setEditName("");
      setEditValue("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Secret",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/secrets/${id}`);
    },
    onSuccess: (_data, id) => {
      toast({ title: "Secret Deleted", description: "The secret has been permanently removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/secrets"] });
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Secret",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleRevealToggle = async (secret: SecretRow) => {
    if (revealedValues[secret.id] !== undefined) {
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[secret.id];
        return next;
      });
      return;
    }
    setLoadingReveal((prev) => ({ ...prev, [secret.id]: true }));
    try {
      const res = await apiRequest("GET", `/api/admin/secrets/${secret.id}/reveal`);
      const data = (await res.json()) as { value: string };
      setRevealedValues((prev) => ({ ...prev, [secret.id]: data.value }));
    } catch (error: any) {
      toast({
        title: "Failed to Reveal Secret",
        description: error.message || "Could not decrypt secret",
        variant: "destructive",
      });
    } finally {
      setLoadingReveal((prev) => ({ ...prev, [secret.id]: false }));
    }
  };

  const openEdit = (secret: SecretRow) => {
    setEditId(secret.id);
    setEditName(secret.name);
    setEditValue("");
    setEditOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <Lock className="w-8 h-8 text-destructive mx-auto mb-2" />
            <CardTitle className="text-center">Access Restricted</CardTitle>
            <CardDescription className="text-center">
              This area is restricted to Solturio administrators only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-6 h-6" />
              <h1 className="text-3xl font-bold" data-testid="text-secrets-title">
                Secrets Vault
              </h1>
            </div>
            <p className="text-muted-foreground">
              AES-256 encrypted storage for sensitive API keys and credentials. Values are never
              stored or transmitted in plaintext.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              AES-256-CBC
            </Badge>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              data-testid="button-add-secret"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Secret
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stored Secrets</CardTitle>
          <CardDescription>
            Click the eye icon to decrypt and reveal a value. Values are only decrypted on-demand
            and are never stored in plaintext.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {secretsLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Loading secrets...
            </div>
          ) : !secrets || secrets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No secrets stored yet</p>
              <p className="text-sm mt-1">Add your first secret using the button above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secrets.map((secret) => (
                  <TableRow key={secret.id} data-testid={`row-secret-${secret.id}`}>
                    <TableCell className="pl-6 font-mono text-sm font-medium">
                      {secret.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-sm select-none"
                          data-testid={`text-secret-value-${secret.id}`}
                        >
                          {revealedValues[secret.id] !== undefined
                            ? revealedValues[secret.id]
                            : "••••••••••••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevealToggle(secret)}
                          disabled={loadingReveal[secret.id]}
                          data-testid={`button-reveal-${secret.id}`}
                          title={
                            revealedValues[secret.id] !== undefined
                              ? "Hide value"
                              : "Reveal value"
                          }
                        >
                          {revealedValues[secret.id] !== undefined ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(secret)}
                          data-testid={`button-edit-${secret.id}`}
                          title="Edit secret"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(secret.id)}
                          data-testid={`button-delete-${secret.id}`}
                          title="Delete secret"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Secret Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Secret</DialogTitle>
            <DialogDescription>
              The value will be AES-256-CBC encrypted before being stored. The plaintext is never
              persisted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                placeholder="e.g. SENDGRID_API_KEY"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                data-testid="input-add-secret-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-value">Value</Label>
              <Input
                id="add-value"
                type="password"
                placeholder="Enter the secret value"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                data-testid="input-add-secret-value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                setAddName("");
                setAddValue("");
              }}
              data-testid="button-cancel-add-secret"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ name: addName, value: addValue })}
              disabled={createMutation.isPending || !addName.trim() || !addValue.trim()}
              data-testid="button-confirm-add-secret"
            >
              {createMutation.isPending ? "Saving..." : "Save Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Secret Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Secret</DialogTitle>
            <DialogDescription>
              Update the name and provide a new value. The old value is never sent to the client —
              you must enter a new value to save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g. SENDGRID_API_KEY"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="input-edit-secret-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">New Value</Label>
              <Input
                id="edit-value"
                type="password"
                placeholder="Enter the new secret value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                data-testid="input-edit-secret-value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditId("");
                setEditName("");
                setEditValue("");
              }}
              data-testid="button-cancel-edit-secret"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({ id: editId, name: editName, value: editValue })
              }
              disabled={updateMutation.isPending || !editName.trim() || !editValue.trim()}
              data-testid="button-confirm-edit-secret"
            >
              {updateMutation.isPending ? "Saving..." : "Update Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The secret and its encrypted value will be permanently
              removed from the vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-secret">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-secret"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

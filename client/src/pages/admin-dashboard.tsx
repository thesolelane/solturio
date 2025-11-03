import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  FileText, 
  Building2, 
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  Settings,
  Lock,
  Globe,
  Rocket
} from "lucide-react";
import { Link } from "wouter";

// Admin email whitelist - in production this should be in environment variables
const ADMIN_EMAILS = [
  "admin@solturio.app",
  "admin@cooperanth.com",
  // Add more admin emails here
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    document.title = "Admin Dashboard - Solturio";
  }, []);

  // Check if user is admin
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
      toast({
        title: "Authentication Required",
        description: "Please log in to access the admin dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading admin dashboard...</div>
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Solturio platform administration and business tools
            </p>
          </div>
          <Badge variant="default" className="px-4 py-2">
            <Shield className="w-4 h-4 mr-1" />
            Admin Access
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logos Protected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5,678</div>
            <p className="text-xs text-muted-foreground">+25% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue (SOL)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">450.5</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Partner DEXs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tools Tabs */}
      <Tabs defaultValue="partnerships" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="partnerships" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = "/admin/partnerships"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Partnership Proposals
                </CardTitle>
                <CardDescription>
                  Generate and manage partnership proposals for DEXs and Solana Foundation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active proposals</p>
                    <p className="text-2xl font-bold">8</p>
                  </div>
                  <Button size="sm">Manage</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = "/admin/dex-outreach"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  DEX Outreach
                </CardTitle>
                <CardDescription>
                  Track and manage DEX platform integration campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Platforms reached</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <Button size="sm">View All</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Launch Campaigns
                </CardTitle>
                <CardDescription>
                  Manage marketing campaigns and token launch partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active campaigns</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <Button size="sm">Manage</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Partner Contacts
                </CardTitle>
                <CardDescription>
                  CRM for managing partner relationships and communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total contacts</p>
                    <p className="text-2xl font-bold">156</p>
                  </div>
                  <Button size="sm">View CRM</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage platform users, wallets, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full">Manage Users</Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  IP Claims
                </CardTitle>
                <CardDescription>
                  Review and process intellectual property claims and disputes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/admin/claims">View Claims</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Logo Registry
                </CardTitle>
                <CardDescription>
                  Manage the global logo registry and verification statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full">View Registry</Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Payment Management
                </CardTitle>
                <CardDescription>
                  Track crypto payments, refunds, and financial reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full">View Payments</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                Coming soon: Real-time metrics and business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Analytics dashboard will be available here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Admin Settings
              </CardTitle>
              <CardDescription>
                Configure platform settings and admin permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Admin Email Whitelist</h3>
                <div className="space-y-1">
                  {ADMIN_EMAILS.map((email) => (
                    <div key={email} className="flex items-center gap-2">
                      <Badge variant="secondary">{email}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Manage Admin Access
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <Users className="w-4 h-4 mr-1" />
              User Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/partnerships">
              <FileText className="w-4 h-4 mr-1" />
              Generate Proposal
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            Export Reports
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="w-4 h-4 mr-1" />
            Security Audit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
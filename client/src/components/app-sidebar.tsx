import { 
  Home, 
  Upload, 
  Package, 
  Settings, 
  Shield, 
  CheckCircle,
  BookOpen,
  Globe,
  FileText,
  Lock,
  BarChart3,
  Building2,
  Users,
  Brain,
  Award,
  KeyRound
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Admin email whitelist - should match admin-dashboard.tsx
const ADMIN_EMAILS = [
  "admin@solturio.app",
  "admin@cooperanth.com",
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const isAdmin = isAuthenticated && user?.email && 
    ADMIN_EMAILS.includes(user.email.toLowerCase());

  // Fetch user's logos to determine if they have collections
  const { data: logos } = useQuery<any[]>({
    queryKey: ['/api/logos'],
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  const hasCollections = logos && logos.length > 0;

  // User menu items (dynamically filtered)
  const userItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      requireAuth: true,
      show: true, // Always show
    },
    {
      title: "Register IP",
      url: "/register",
      icon: Upload,
      requireAuth: true,
      show: true, // Always show
    },
    {
      title: "My Collections",
      url: "/collections",
      icon: Package,
      requireAuth: true,
      show: true, // Always show
    },
    {
      title: "Artwork Licensing",
      url: "/artwork-licensing",
      icon: Award,
      requireAuth: true,
      show: hasCollections, // Only show if user has collections
    },
    {
      title: "Authorized Usage",
      url: "/authorized-usage",
      icon: CheckCircle,
      requireAuth: true,
      show: true, // Always show
    },
    {
      title: "Contract Verification",
      url: "/contract-verification",
      icon: Shield,
      requireAuth: true,
      show: true, // Always show
    },
    {
      title: "Account Settings",
      url: "/account",
      icon: Settings,
      requireAuth: true,
      show: true, // Always show
    },
  ].filter(item => item.show !== false); // Filter out items that shouldn't be shown

  // Public menu items
  const publicItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
      requireAuth: false,
    },
    {
      title: "DEX Protection",
      url: "/dex-protection",
      icon: Shield,
      requireAuth: false,
    },
    {
      title: "Learn About Solturio",
      url: "/dex-intro",
      icon: Globe,
      requireAuth: false,
    },
    {
      title: "IP Knowledge Base",
      url: "/knowledge-base",
      icon: BookOpen,
      requireAuth: false,
    },
    {
      title: "IP Protection Guide",
      url: "/ip-guide",
      icon: FileText,
      requireAuth: false,
    },
    {
      title: "IP Quiz Game",
      url: "/ip-quiz",
      icon: Brain,
      requireAuth: false,
    },
    {
      title: "Wallet Recovery",
      url: "/wallet-recovery",
      icon: KeyRound,
      requireAuth: false,
    },
  ];

  // Admin menu items
  const adminItems = [
    {
      title: "Admin Dashboard",
      url: "/admin",
      icon: BarChart3,
    },
    {
      title: "Partnership Tools",
      url: "/admin/partnerships",
      icon: Building2,
    },
    {
      title: "User Management",
      url: "/admin/users",
      icon: Users,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img 
              src="/solturio-logo-light.png" 
              alt="Solturio" 
              className="h-8 w-8 dark:hidden"
            />
            <img 
              src="/solturio-logo-dark.png" 
              alt="Solturio" 
              className="h-8 w-8 hidden dark:block"
            />
            <span className="font-bold text-lg">Solturio</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Public Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicItems.map((item) => {
                if (item.requireAuth && !isAuthenticated) return null;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a 
                        href={item.url}
                        className={location === item.url ? "bg-sidebar-accent" : ""}
                        data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Section - Only show when authenticated */}
        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>My Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a 
                        href={item.url}
                        className={location === item.url ? "bg-sidebar-accent" : ""}
                        data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Section - Only show for admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              Administration
              <Badge variant="default" className="h-4 px-1 text-[10px]">
                <Lock className="w-2 h-2 mr-0.5" />
                Admin
              </Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a 
                        href={item.url}
                        className={location === item.url ? "bg-sidebar-accent" : ""}
                        data-testid={`link-sidebar-admin-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium truncate">{user?.firstName || user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'No email'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full" 
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Login
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
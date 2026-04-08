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
  KeyRound,
  Coins,
  DollarSign,
  ClipboardList,
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
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isAdmin = isAuthenticated && user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // Fetch user's logos to determine if they have collections
  const { data: logos } = useQuery<any[]>({
    queryKey: ["/api/logos"],
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  const hasCollections = logos && logos.length > 0;

  // My IP section — core account actions
  const myIpItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home, show: true },
    { title: "Register IP", url: "/register", icon: Upload, show: true },
    { title: "My Collections", url: "/collections", icon: Package, show: true },
    { title: "Logo Registry", url: "/logo-registry", icon: ClipboardList, show: hasCollections },
    { title: "Artwork Licensing", url: "/artwork-licensing", icon: Award, show: hasCollections },
    { title: "Authorized Usage", url: "/authorized-usage", icon: CheckCircle, show: true },
    { title: "Contract Verification", url: "/contract-verification", icon: Shield, show: true },
  ].filter((item) => item.show !== false);

  // Settings section — account management and utilities
  const settingsItems = [
    { title: "Account Settings", url: "/account", icon: Settings },
    { title: "Wallet Recovery", url: "/wallet-recovery", icon: KeyRound },
  ];

  // Discover section — public product/platform pages
  const discoverItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "DEX Protection", url: "/dex-protection", icon: Shield },
    { title: "Learn About Solturio", url: "/dex-intro", icon: Globe },
    { title: "$SOLT Tokenomics", url: "/tokenomics", icon: Coins },
  ];

  // Learn section — educational resources
  const learnItems = [
    { title: "IP Knowledge Base", url: "/knowledge-base", icon: BookOpen },
    { title: "IP Protection Guide", url: "/ip-guide", icon: FileText },
    { title: "IP Quiz Game", url: "/ip-quiz", icon: Brain },
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
    {
      title: "IP Claims",
      url: "/admin/claims",
      icon: Shield,
    },
    {
      title: "Payments",
      url: "/admin/payments",
      icon: DollarSign,
    },
    {
      title: "Secrets Vault",
      url: "/admin/secrets",
      icon: KeyRound,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src="/solturio-logo-light.png" alt="Solturio" className="h-8 w-8 dark:hidden" />
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
        {/* Discover — public product/platform pages */}
        <SidebarGroup>
          <SidebarGroupLabel>Discover</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {discoverItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      className={location === item.url ? "bg-sidebar-accent" : ""}
                      data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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

        {/* Learn — educational resources */}
        <SidebarGroup>
          <SidebarGroupLabel>Learn</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {learnItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      className={location === item.url ? "bg-sidebar-accent" : ""}
                      data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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

        {/* My IP — core authenticated actions */}
        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>My IP</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {myIpItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        className={location === item.url ? "bg-sidebar-accent" : ""}
                        data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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

        {/* Settings — account management and utilities */}
        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        className={location === item.url ? "bg-sidebar-accent" : ""}
                        data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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

        {/* Administration — admin only */}
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
                        data-testid={`link-sidebar-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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
              <p className="font-medium truncate">{user?.firstName || user?.email || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "No email"}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/api/logout")}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={() => (window.location.href = "/api/login")}
            data-testid="button-login"
          >
            Login
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

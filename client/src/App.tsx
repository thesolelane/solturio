import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Checkout from "@/pages/checkout";
import Collections from "@/pages/collections";
import AccountPage from "@/pages/account";
import AuthorizedUsage from "@/pages/authorized-usage";
import DexProtection from "@/pages/dex-protection";
import DexIntroduction from "@/pages/dex-introduction";
import ContractVerification from "@/pages/contract-verification";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminPartnerships from "@/pages/admin-partnerships";
import AdminClaims from "@/pages/admin-claims";
import KnowledgeBase from "@/pages/knowledge-base";
import IPGuide from "@/pages/ip-guide";
import IPQuiz from "@/pages/ip-quiz";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show landing page when not authenticated, otherwise show dashboard
  const HomePage = isLoading || !isAuthenticated ? Landing : Dashboard;

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/upload" component={Upload} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/collections" component={Collections} />
      <Route path="/account" component={AccountPage} />
      <Route path="/authorized-usage" component={AuthorizedUsage} />
      <Route path="/dex-protection" component={DexProtection} />
      <Route path="/dex-intro" component={DexIntroduction} />
      <Route path="/contract-verification" component={ContractVerification} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/partnerships" component={AdminPartnerships} />
      <Route path="/admin/claims" component={AdminClaims} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/ip-guide" component={IPGuide} />
      <Route path="/ip-quiz" component={IPQuiz} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  // Custom sidebar width for Solturio
  const style = {
    "--sidebar-width": "16rem",       // 256px
    "--sidebar-width-icon": "3rem",   // 48px
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <div className="text-sm text-muted-foreground">
                  Plant Your Standard on Chain™
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

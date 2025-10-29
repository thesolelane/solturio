import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Checkout from "@/pages/checkout";
import Collections from "@/pages/collections";
import AccountPage from "@/pages/account";
import AuthorizedUsage from "@/pages/authorized-usage";
import DexProtection from "@/pages/dex-protection";
import DexIntroduction from "@/pages/dex-introduction";
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
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

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
import Collections from "@/pages/collections";
import AccountPage from "@/pages/account";
import AuthorizedUsage from "@/pages/authorized-usage";
import DexProtection from "@/pages/dex-protection";
import DexIntroduction from "@/pages/dex-introduction";
import ContractVerification from "@/pages/contract-verification";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminPartnerships from "@/pages/admin-partnerships";
import AdminClaims from "@/pages/admin-claims";
import AdminUsers from "@/pages/admin-users";
import AdminPayments from "@/pages/admin-payments";
import AdminSecrets from "@/pages/admin-secrets";
import KnowledgeBase from "@/pages/knowledge-base";
import IPGuide from "@/pages/ip-guide";
import IPQuiz from "@/pages/ip-quiz";
import IPQuizBattle from "@/pages/ip-quiz-battle";
import ArtworkLicensing from "@/pages/artwork-licensing";
import CreateLicense from "@/pages/create-license";
import Licenses from "@/pages/licenses";
import Tokenomics from "@/pages/tokenomics";
import RegisterSelect from "@/pages/register-select";
import RegisterTokenLaunch from "@/pages/register-token-launch";
import RegisterArtwork from "@/pages/register-artwork";
import WalletTierSelection from "@/pages/wallet-tier-selection";
import CeremonyStage1Warning from "@/pages/ceremony-stage-1-warning";
import CeremonyStage2Payment from "@/pages/ceremony-stage-2-payment";
import CeremonyStage3Pledge from "@/pages/ceremony-stage-3-pledge";
import CeremonyStage4Reveal from "@/pages/ceremony-stage-4-reveal";
import CeremonyStage5Verification from "@/pages/ceremony-stage-5-verification";
import CeremonyStage6Terms from "@/pages/ceremony-stage-6-terms";
import WalletRecovery from "@/pages/wallet-recovery";
import HowToShare from "@/pages/how-to-share";
import Discover from "@/pages/discover";
import VerifyWallet from "@/pages/verify-wallet";
import Activate from "@/pages/activate";
import MusicCollections from "@/pages/music";
import MusicCollectionDetail from "@/pages/music-collection";
import MusicReleaseDetail from "@/pages/music-release";
import MusicTrackDetail from "@/pages/music-track";
import ExtensionAuth from "@/pages/extension-auth";
import BindContract from "@/pages/bind-contract";
import LogoRegistry from "@/pages/logo-registry";
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
      <Route path="/collections" component={Collections} />
      <Route path="/account" component={AccountPage} />
      <Route path="/authorized-usage" component={AuthorizedUsage} />
      <Route path="/dex-protection" component={DexProtection} />
      <Route path="/dex-intro" component={DexIntroduction} />
      <Route path="/contract-verification" component={ContractVerification} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/partnerships" component={AdminPartnerships} />
      <Route path="/admin/claims" component={AdminClaims} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/secrets" component={AdminSecrets} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/ip-guide" component={IPGuide} />
      <Route path="/ip-quiz" component={IPQuiz} />
      <Route path="/ip-quiz-battle" component={IPQuizBattle} />
      <Route path="/artwork-licensing" component={ArtworkLicensing} />
      <Route path="/create-license" component={CreateLicense} />
      <Route path="/create-license/:logoId" component={CreateLicense} />
      <Route path="/licenses" component={Licenses} />
      <Route path="/tokenomics" component={Tokenomics} />
      <Route path="/register" component={RegisterSelect} />
      <Route path="/register/token-launch" component={RegisterTokenLaunch} />
      <Route path="/register/artwork" component={RegisterArtwork} />
      <Route path="/bind-contract/:id" component={BindContract} />
      <Route path="/logo-registry" component={LogoRegistry} />
      <Route path="/register/wallet-tier" component={WalletTierSelection} />
      <Route path="/ceremony/stage-1-warning" component={CeremonyStage1Warning} />
      <Route path="/ceremony/stage-2-payment" component={CeremonyStage2Payment} />
      <Route path="/ceremony/stage-3-pledge" component={CeremonyStage3Pledge} />
      <Route path="/ceremony/stage-4-reveal" component={CeremonyStage4Reveal} />
      <Route path="/ceremony/stage-5-verification" component={CeremonyStage5Verification} />
      <Route path="/ceremony/stage-6-terms" component={CeremonyStage6Terms} />
      <Route path="/wallet-recovery" component={WalletRecovery} />
      <Route path="/how-to-share" component={HowToShare} />
      <Route path="/discover" component={Discover} />
      <Route path="/verify-wallet" component={VerifyWallet} />
      <Route path="/activate" component={Activate} />
      <Route path="/music" component={MusicCollections} />
      <Route path="/music/collections/:id" component={MusicCollectionDetail} />
      <Route path="/music/releases/:id" component={MusicReleaseDetail} />
      <Route path="/music/tracks/:id" component={MusicTrackDetail} />
      <Route path="/extension-auth" component={ExtensionAuth} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  // Custom sidebar width for Solturio
  const style = {
    "--sidebar-width": "16rem", // 256px
    "--sidebar-width-icon": "3rem", // 48px
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
                <div className="text-sm text-muted-foreground">Plant Your Standard on Chain™</div>
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

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Layouts
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import Ranking from "./pages/Ranking";
import Affiliate from "./pages/Affiliate";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import BrandArea from "./pages/BrandArea";
import Products from "./pages/Products";
import TikTok from "./pages/TikTok";
import Chat from "./pages/Chat";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import RedirectLink from "./pages/RedirectLink";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseLearn from "./pages/CourseLearn";
import CourseBuilder from "./pages/CourseBuilder";
import Opportunities from "./pages/Opportunities";
import Reels from "./pages/Reels";
import Live from "./pages/Live";
import LiveShop from "./pages/LiveShop";
import Marketplace from "./pages/Marketplace";
import Analytics from "./pages/Analytics";
import AICopilot from "./pages/AICopilot";
import Wallet from "./pages/Wallet";
import Discover from "./pages/Discover";
import Trending from "./pages/Trending";
import PublicProfile from "./pages/PublicProfile";
import Invites from "./pages/Invites";
import PostDetail from "./pages/PostDetail";
import VSL from "./pages/VSL";
import Studio from "./pages/Studio";
import MeusInfluencers from "./pages/MeusInfluencers";
import Inicio from "./pages/Inicio";
import Jornada from "./pages/Jornada";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/r/:code" element={<RedirectLink />} />
            <Route path="/vsl" element={<VSL />} />
            
            {/* App routes with layout */}
            <Route element={<AppLayout />}>
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/jornada" element={<Jornada />} />
              <Route path="/comunidade" element={<Feed />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/communities/:id" element={<CommunityDetail />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/brands" element={<BrandArea />} />
              <Route path="/products" element={<Products />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/trending" element={<Trending />} />
              <Route path="/invites" element={<Invites />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/tiktok" element={<TikTok />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/create" element={<Feed />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/meus-influencers" element={<MeusInfluencers />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/live" element={<Live />} />
              <Route path="/live/:id" element={<LiveShop />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/ai" element={<AICopilot />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/courses/:id/learn" element={<CourseLearn />} />
              <Route path="/courses/:id/builder" element={<CourseBuilder />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

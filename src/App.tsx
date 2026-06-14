import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Layouts
import { AppLayout } from "@/components/layout/AppLayout";

// Pages — MVP "Conecta localizado" (marketplace de campanhas).
// Páginas fora do MVP foram tiradas das rotas (arquivos preservados — fase 2+).
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Affiliate from "./pages/Affiliate";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import BrandArea from "./pages/BrandArea";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import RedirectLink from "./pages/RedirectLink";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Wallet from "./pages/Wallet";
import Inicio from "./pages/Inicio";
import Mapa from "./pages/Mapa";

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
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/install" element={<Install />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/r/:code" element={<RedirectLink />} />

            {/* App routes with layout */}
            <Route element={<AppLayout />}>
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/brands" element={<BrandArea />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
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

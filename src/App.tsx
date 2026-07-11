import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";

// Layout (shell) fica eager — é a casca das rotas do app.
import { AppLayout } from "@/components/layout/AppLayout";

// Code-splitting por rota: cada página vira um chunk carregado sob demanda.
// Antes tudo vinha num bundle único de ~986 kB, o que travava a abertura no
// celular. Agora o carregamento inicial é enxuto e cada tela chega quando é aberta.
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const Install = lazy(() => import("./pages/Install"));
const Admin = lazy(() => import("./pages/Admin"));
const BrandArea = lazy(() => import("./pages/BrandArea"));
const Checkout = lazy(() => import("./pages/Checkout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));
const RedirectLink = lazy(() => import("./pages/RedirectLink"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Mapa = lazy(() => import("./pages/Mapa"));
const EmBreve = lazy(() => import("./pages/EmBreve"));
const Feed = lazy(() => import("./pages/Feed"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const MediaKit = lazy(() => import("./pages/MediaKit"));
const Rede = lazy(() => import("./pages/Rede"));

const queryClient = new QueryClient();

// Fallback leve enquanto o chunk da rota chega (instantâneo após o 1º load, fica em cache).
function PageLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/install" element={<Install />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/r/:code" element={<RedirectLink />} />
              <Route path="/i/:code" element={<MediaKit />} />

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
                <Route path="/em-breve" element={<EmBreve />} />
                <Route path="/comunidade" element={<Feed />} />
                <Route path="/rede" element={<Rede />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/u/:username" element={<PublicProfile />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

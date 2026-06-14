import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import logoImg from "@/assets/color-palette-ref.png";

export default function Auth() {
  const { user, loading, userRole, signIn, signUp } = useAuth();
  const { needsOnboarding } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");

  // Redirect pós-login: 1º acesso vai pro onboarding; depois, pro destino do papel.
  if (user && !loading) {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
    const target = userRole?.role === "brand" ? "/brands" : "/inicio";
    return <Navigate to={target} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try { await signIn(loginEmail, loginPassword); } catch {} finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try { await signUp(signupEmail, signupPassword, signupUsername); } catch {} finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-foreground relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[160px] opacity-[0.06] bg-primary" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src={logoImg} alt={APP_NAME} className="h-16 w-16 mx-auto rounded-2xl object-cover mb-5" />
          <h1 className="text-2xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-white/20 mt-1.5 text-sm">{APP_TAGLINE}</p>
        </div>

        <div className="bg-background rounded-3xl p-6 shadow-2xl border border-border/10">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 bg-muted/30 rounded-full border-0 mb-5">
              <TabsTrigger value="login" className="rounded-full text-xs">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full text-xs">Entrar pra dentro</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[11px] text-muted-foreground/50">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input id="login-email" type="email" placeholder="seu@email.com" className="pl-10 rounded-xl h-11 border-border/15 text-sm" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[11px] text-muted-foreground/50">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input id="login-password" type="password" placeholder="••••••••" className="pl-10 rounded-xl h-11 border-border/15 text-sm" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl h-11 bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>

              {/* Acesso de teste — sem Supabase (loga direto) */}
              <div className="mt-8 pt-6 border-t border-border/10">
                <p className="text-[10px] text-center text-muted-foreground/30 mb-4 uppercase tracking-widest font-bold">Acesso de Teste</p>
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-primary/30 text-xs h-11 bg-transparent hover:bg-primary/10"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    try { await signIn("teste@onlyshop.com", "teste123"); } catch {} finally { setIsLoading(false); }
                  }}
                >
                  ⚡ Entrar com conta de teste
                </Button>
                <p className="text-[10px] text-center text-muted-foreground/30 mt-2">
                  teste@onlyshop.com · teste123
                </p>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-username" className="text-[11px] text-muted-foreground/50">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input id="signup-username" type="text" placeholder="seu_usuario" className="pl-10 rounded-xl h-11 border-border/15 text-sm" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)} minLength={3} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[11px] text-muted-foreground/50">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input id="signup-email" type="email" placeholder="seu@email.com" className="pl-10 rounded-xl h-11 border-border/15 text-sm" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-[11px] text-muted-foreground/50">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10 rounded-xl h-11 border-border/15 text-sm" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} minLength={6} required />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl h-11 bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar pra dentro"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground/30">
                  Ao criar conta, você concorda com nossos{" "}
                  <a href="/terms" className="text-primary hover:underline">Termos</a> e{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacidade</a>.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

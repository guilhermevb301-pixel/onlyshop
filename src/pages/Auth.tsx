import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import logoImg from "@/assets/color-palette-ref.png";

export default function Auth() {
  const { user, loading, userRole, signIn, signUp } = useAuth();
  const { needsOnboarding } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");

  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);

  // Estado de checagem de sessão: evita o flash do form num refresh logado.
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect pós-login: 1º acesso vai pro onboarding; depois, pro destino do papel.
  if (user) {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
    const target = userRole?.role === "brand" ? "/brands" : "/inicio";
    return <Navigate to={target} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch {
      setError("Email ou senha inválidos. Confira e tente de novo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupUsername);
    } catch {
      setError("Não rolou criar a conta. Verifique os dados e tente de novo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
      {/* Ambiente magenta ↔ cyan (dualidade da marca) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[170px] opacity-[0.10] bg-primary" />
        <div className="absolute -bottom-44 right-1/4 w-[420px] h-[420px] rounded-full blur-[170px] opacity-[0.06] bg-accent" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-9 animate-fade-in">
          <img
            src={logoImg}
            alt=""
            aria-hidden="true"
            className="h-16 w-16 mx-auto rounded-2xl object-cover mb-5 ring-1 ring-white/10"
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            Marketplace de campanhas
          </span>
          <h1 className="mt-1.5 text-2xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-muted-foreground/60 mt-1.5 text-sm">{APP_TAGLINE}</p>
        </div>

        {/* Card herói com double-bezel + glow de marca */}
        <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.1] to-transparent p-px shadow-[0_24px_80px_-20px_hsl(346_100%_58%/0.28)] animate-slide-up [animation-delay:80ms]">
          <div className="rounded-[1.65rem] bg-card/85 backdrop-blur-xl p-6 ring-1 ring-white/[0.04]">
            <Tabs
              defaultValue="login"
              className="w-full"
              onValueChange={() => setError(null)}
            >
              <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/40 rounded-full border-0 mb-5">
                <TabsTrigger
                  value="login"
                  className="rounded-full text-xs data-[state=active]:bg-white/[0.06] data-[state=active]:text-white"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-full text-xs data-[state=active]:bg-white/[0.06] data-[state=active]:text-white"
                >
                  Criar conta
                </TabsTrigger>
              </TabsList>

              {/* Aviso de erro caprichado (compartilhado) */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 ring-1 ring-destructive/20 px-3 py-2.5 animate-fade-in"
                >
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive leading-snug">{error}</p>
                </div>
              )}

              {/* ---------------- LOGIN ---------------- */}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-[11px] text-muted-foreground/60">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 rounded-xl h-11 border-border/40 text-sm"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-[11px] text-muted-foreground/60">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-11 rounded-xl h-11 border-border/40 text-sm"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw((s) => !s)}
                        aria-label={showLoginPw ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors"
                      >
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    aria-busy={isLoading}
                    className="group w-full rounded-xl h-12 bg-gradient-primary text-white border-0 shadow-lg shadow-primary/25 text-sm font-semibold active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="sr-only">Entrando…</span>
                      </>
                    ) : (
                      <>
                        Entrar
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </>
                    )}
                  </Button>
                </form>

              </TabsContent>

              {/* ---------------- SIGNUP ---------------- */}
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-username" className="text-[11px] text-muted-foreground/60">
                      Usuário
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="seu_usuario"
                        className="pl-10 rounded-xl h-11 border-border/40 text-sm"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        minLength={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-[11px] text-muted-foreground/60">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 rounded-xl h-11 border-border/40 text-sm"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-[11px] text-muted-foreground/60">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        id="signup-password"
                        type={showSignupPw ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10 pr-11 rounded-xl h-11 border-border/40 text-sm"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPw((s) => !s)}
                        aria-label={showSignupPw ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors"
                      >
                        {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    aria-busy={isLoading}
                    className="group w-full rounded-xl h-12 bg-gradient-primary text-white border-0 shadow-lg shadow-primary/25 text-sm font-semibold active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="sr-only">Criando conta…</span>
                      </>
                    ) : (
                      <>
                        Criar conta
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground/50 leading-relaxed">
                    Ao criar conta, você concorda com nossos{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Termos
                    </Link>{" "}
                    e{" "}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacidade
                    </Link>
                    .
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

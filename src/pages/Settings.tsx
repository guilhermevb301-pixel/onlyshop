import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Lock, Moon, Sun, Shield, Loader2, ArrowLeft, LogOut, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { LocationNichesCard } from "@/components/profile/LocationNichesCard";
import { ConnectTikTok } from "@/components/tiktok/ConnectTikTok";
import { SocialLinksCard } from "@/components/profile/SocialLinksCard";
import { IntroVideoCard } from "@/components/profile/IntroVideoCard";
import { ReachCard } from "@/components/profile/ReachCard";
import { VideoGalleryCard } from "@/components/profile/VideoGalleryCard";
import { ShippingAddressCard } from "@/components/profile/ShippingAddressCard";

// Demo detection — espelha o DEMO_FLAG/DEMO_EMAIL do useAuth.
// No modo demo (login localStorage, sem backend) qualquer chamada real ao
// Supabase explode. Aqui simulamos o sucesso pra a demo parecer um produto pronto.
const DEMO_EMAIL = "teste@onlyshop.com";
const isDemoSession = (email?: string | null) =>
  localStorage.getItem("onlyshop_demo_session") === "1" || email === DEMO_EMAIL;

// ── Card premium: casca + núcleo (double-bezel), squircle, OLED depth ──────────
function SettingsCard({
  icon,
  eyebrow,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="animate-slide-up rounded-[1.5rem] border border-border/40 bg-gradient-to-b from-white/[0.05] to-transparent p-[1px]"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="rounded-[1.4rem] bg-card/80 p-5 ring-1 ring-inset ring-white/[0.04] shadow-[var(--shadow-bezel-inset)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            {icon}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            {eyebrow && (
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                {eyebrow}
              </span>
            )}
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground/70">{description}</p>}
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Theme
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  if (loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;

  const demo = isDemoSession(user.email);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Senha muito curta", description: "Mínimo 6 caracteres" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Senhas não conferem" });
      return;
    }
    setChangingPassword(true);
    try {
      // Modo demo: sem backend. Simula o sucesso em vez de explodir no Supabase.
      if (demo) {
        await new Promise((r) => setTimeout(r, 600));
        toast({ title: "Senha alterada (demo)", description: "No app real, sua senha seria atualizada agora." });
        setNewPassword("");
        setConfirmPassword("");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error?.message ?? "Tente novamente." });
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-10 w-10 shrink-0 rounded-full ring-1 ring-border/40 active:scale-[.95]"
        >
          <Link to="/profile" aria-label="Voltar para o perfil">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Ajustes
          </span>
          <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            Personalize sua conta e como você aparece no mapa.
          </p>
        </div>
      </div>

      {/* Appearance */}
      <SettingsCard
        icon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        eyebrow="Aparência"
        title="Tema do app"
        delay={40}
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/40 px-4 py-3 ring-1 ring-inset ring-white/[0.04]">
          <div className="min-w-0">
            <p className="text-sm font-medium">Modo escuro</p>
            <p className="text-xs text-muted-foreground/70">Recomendado · o OnlyShop foi feito para o escuro.</p>
          </div>
          <Switch checked={isDark} onCheckedChange={toggleTheme} aria-label="Alternar modo escuro" />
        </div>
      </SettingsCard>

      {/* Location & niches (componente do track) */}
      <LocationNichesCard delay={80} />

      {/* TikTok connection */}
      <SettingsCard
        icon={<Music2 className="h-4 w-4" />}
        eyebrow="Redes sociais"
        title="Conexões"
        description="Conecte sua conta do TikTok para postar vídeos."
        delay={120}
      >
        <ConnectTikTok />
      </SettingsCard>

      <SocialLinksCard delay={140} />

      <ReachCard delay={145} />

      <ShippingAddressCard delay={148} />

      <IntroVideoCard delay={150} />

      <VideoGalleryCard delay={155} />

      {/* Security */}
      <SettingsCard
        icon={<Lock className="h-4 w-4" />}
        eyebrow="Segurança"
        title="Alterar senha"
        description="Use no mínimo 6 caracteres."
        delay={160}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground/70">
              Nova senha
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="mt-1.5 h-11 rounded-xl border-border/30 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground/70">
              Confirmar senha
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repita a senha"
              className="mt-1.5 h-11 rounded-xl border-border/30 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            className="group h-11 w-full gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow-cta)] transition-all duration-200 ease-[var(--ease-fluid)] active:scale-[.98] disabled:opacity-50 disabled:shadow-none"
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
            aria-busy={changingPassword}
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only">Alterando senha…</span>
              </>
            ) : (
              <>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                Alterar senha
              </>
            )}
          </Button>
        </div>
      </SettingsCard>

      {/* Account info */}
      <SettingsCard icon={<Shield className="h-4 w-4" />} eyebrow="Conta" title="Sua conta" delay={200}>
        <div className="space-y-3">
          <div className="rounded-2xl bg-secondary/40 px-4 py-3 ring-1 ring-inset ring-white/[0.04]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Email</p>
            <p className="mt-0.5 truncate text-sm font-medium">{user.email}</p>
          </div>
          <Separator className="bg-border/20" />
          <Button
            variant="outline"
            className="h-11 w-full gap-2 rounded-full border-destructive/30 text-sm text-destructive transition-transform duration-200 ease-[var(--ease-fluid)] hover:bg-destructive/10 active:scale-[.98]"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </SettingsCard>

      {/* Legal */}
      <div className="flex justify-center gap-5 pt-1">
        <Link
          to="/terms"
          className="text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground"
        >
          Termos de Uso
        </Link>
        <Link
          to="/privacy"
          className="text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground"
        >
          Privacidade
        </Link>
      </div>
    </div>
  );
}

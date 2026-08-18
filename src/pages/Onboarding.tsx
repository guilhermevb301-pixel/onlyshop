import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, Store, Sparkles, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { OnboardingRole } from "@/lib/onboarding";
import type { GeoLocation } from "@/hooks/useGeolocation";
import { useGeolocation } from "@/hooks/useGeolocation";
import RoleSelectCard from "@/components/onboarding/RoleSelectCard";
import LocationStep from "@/components/onboarding/LocationStep";
import logoImg from "@/assets/color-palette-ref.png";

// Nichos sugeridos (mesma família usada no match/Discover).
const NICHES = [
  "Beleza", "Skincare", "Moda", "Acessórios", "Fitness", "Suplementos",
  "Alimentação", "Tech", "Gadgets", "Casa", "Pet", "Infantil", "Local",
];

const GENDERS = [
  { value: "any", label: "Prefiro não dizer" },
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
];

export default function Onboarding() {
  const { user, loading: authLoading, updateProfile, refreshUserData } = useAuth();
  const { role, needsOnboarding, chooseRole, complete } = useOnboarding();
  const { saveLocation } = useGeolocation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0=papel, 1=localização, 2=perfil
  const [pickedRole, setPickedRole] = useState<OnboardingRole | null>(null);
  const [loc, setLoc] = useState<GeoLocation | null>(null);
  const [saving, setSaving] = useState(false);

  // Perfil — influencer
  const [displayName, setDisplayName] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [gender, setGender] = useState<string>("any");
  const [followers, setFollowers] = useState("");
  // Perfil — lojista
  const [storeName, setStoreName] = useState("");

  const dest = useMemo(
    () => (pickedRole === "brand" ? "/brands" : "/mapa"),
    [pickedRole]
  );

  // Sem usuário -> manda pro login.
  if (!authLoading && !user) return <Navigate to="/auth" replace />;
  // Já passou pelo onboarding -> vai pro destino do papel.
  if (!authLoading && user && !needsOnboarding) {
    return <Navigate to={role === "brand" ? "/brands" : "/mapa"} replace />;
  }

  const toggleNiche = (n: string) =>
    setNiches((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );

  // Passo 1 concluído: grava o papel e avança.
  const handleRole = async (r: OnboardingRole) => {
    setPickedRole(r);
    try {
      await chooseRole(r);
    } catch {
      // demo/otimista — segue mesmo se a escrita real falhar
    }
    setStep(1);
  };

  // Passo 2 concluído: guarda localização e avança.
  const handleLocation = (l: GeoLocation) => {
    setLoc(l);
    setStep(2);
  };

  // Passo 3 concluído: salva perfil mínimo + finaliza onboarding.
  const handleFinish = async () => {
    setSaving(true);
    try {
      if (pickedRole === "brand") {
        // Loja: salva nome da loja como display_name do perfil.
        const name = storeName.trim() || "Minha loja";
        try {
          await updateProfile({ display_name: name });
        } catch {
          // demo / sem Supabase — segue
        }
        // Espelha o perfil demo no localStorage pra o match local enxergar a loja.
        try {
          localStorage.setItem(
            "onlyshop_demo_profile",
            JSON.stringify({ role: "brand", displayName: name })
          );
        } catch {
          // localStorage indisponível — ignora
        }
        if (loc) {
          try {
            await saveLocation({ ...loc, target: "brand" });
          } catch {
            // demo — localização já ficou no localStorage via LocationStep
          }
        }
      } else {
        // Influencer: nome de exibição + nichos (+ gênero/seguidores opcionais).
        const name = displayName.trim() || "Creator";
        try {
          // Salva nome + nichos no perfil REAL (antes só ia pro localStorage demo-morto,
          // então o guia "Complete seu perfil" ficava cravado mesmo tendo preenchido).
          await updateProfile({ display_name: name, ...(niches.length ? { niches } : {}) } as any);
        } catch {
          // demo — segue
        }
        // Persiste o perfil completo do influencer pra o match local filtrar por nicho.
        try {
          localStorage.setItem(
            "onlyshop_demo_profile",
            JSON.stringify({
              role: "affiliate",
              displayName: name,
              niches,
              gender,
              followers: Number(followers) || 0,
            })
          );
        } catch {
          // localStorage indisponível — ignora
        }
        if (loc) {
          try {
            await saveLocation({ ...loc, target: "profile" });
          } catch {
            // demo — segue
          }
        }
      }
    } finally {
      // Recarrega papel+cidade pro contexto ANTES de navegar — senão needsOnboarding
      // ainda enxerga "sem cidade" e devolve o usuário pro onboarding (loop).
      try { await refreshUserData(); } catch { /* ignora */ }
      complete();
      setSaving(false);
      navigate(dest, { replace: true });
    }
  };

  // Validação mínima do passo 3.
  const canFinish =
    pickedRole === "brand"
      ? storeName.trim().length >= 2
      : pickedRole === "ambassador"
      ? displayName.trim().length >= 2 // embaixador: só o nome (nicho é opcional)
      : displayName.trim().length >= 2 && niches.length > 0;

  const totalSteps = 3;

  // Eyebrow + ícone por passo (DNA magenta/cyan do produto).
  const eyebrow = step === 0 ? "Papel" : step === 1 ? "Localização" : "Perfil";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
      {/* Ambiente magenta ↔ cyan (DNA da marca) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[160px] opacity-[0.10] bg-primary" />
        <div className="absolute -bottom-44 right-1/4 w-[420px] h-[420px] rounded-full blur-[170px] opacity-[0.06] bg-accent" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + eyebrow + tagline do passo */}
        <div className="text-center mb-7 animate-fade-in">
          <img
            src={logoImg}
            alt={APP_NAME}
            className="h-14 w-14 mx-auto rounded-2xl object-cover mb-4 ring-1 ring-white/10"
          />
          <span className="inline-block text-[10px] uppercase tracking-[0.22em] font-semibold text-primary/80 mb-2">
            {eyebrow}
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {step === 0 && `Como você vai usar o ${APP_NAME}?`}
            {step === 1 && "De onde você fala?"}
            {step === 2 &&
              (pickedRole === "brand" ? "Sobre a sua loja" : "Sobre você")}
          </h1>
          <p className="text-white/50 mt-1.5 text-xs leading-snug px-2">
            {step === 0 && "Escolha seu lado do balcão. Dá pra mudar depois."}
            {step === 1 &&
              "A gente conecta você com quem está perto — match local de verdade."}
            {step === 2 &&
              (pickedRole === "brand"
                ? "Só o básico pra creators acharem sua loja."
                : "Só o básico pra marcas certas chegarem em você.")}
          </p>
        </div>

        {/* Card — double-bezel (casca + núcleo) sobre OLED */}
        <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.08] to-transparent p-px shadow-[0_24px_80px_-20px_hsl(346_100%_58%/0.25)] animate-slide-up [animation-delay:80ms]">
        <div className="rounded-[1.65rem] bg-card/80 backdrop-blur-xl p-6 border border-white/[0.04]">
          {/* Progresso dos passos — trilhos preenchem com movimento (não só cor) */}
          <div className="flex items-center gap-1.5 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full bg-white/[0.08] overflow-hidden"
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-primary origin-left transition-transform duration-500 ease-[var(--ease-fluid)]",
                    i <= step ? "scale-x-100" : "scale-x-0"
                  )}
                />
              </div>
            ))}
          </div>

          {/* Voltar — alvo de toque ≥44px, contraste legível */}
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground mb-4 -ml-1 py-2 px-1 min-h-[44px] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          )}

          {/* Cada passo reanima na troca (key={step}) com fade-up + ease fluido */}
          <div
            key={step}
            className="animate-[fadeIn_.35s_cubic-bezier(0.32,0.72,0,1)]"
          >
          {/* PASSO 1 — Papel */}
          {step === 0 && (
            <RoleSelectCard onSelect={handleRole} selected={pickedRole} />
          )}

          {/* PASSO 2 — Localização */}
          {step === 1 && (
            <LocationStep
              onDone={handleLocation}
              target={pickedRole === "brand" ? "brand" : "profile"}
            />
          )}

          {/* PASSO 3 — Perfil mínimo */}
          {step === 2 && (
            <div className="space-y-4">
              {pickedRole === "brand" ? (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground/50">
                    Nome da loja
                  </Label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input
                      placeholder="Ex: Boutique Bella"
                      className="pl-10 rounded-xl h-11 border-border/15 text-sm"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground/50">
                      Nome de exibição
                    </Label>
                    <div className="relative">
                      <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                      <Input
                        placeholder="Como as marcas vão te ver"
                        className="pl-10 rounded-xl h-11 border-border/15 text-sm"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground/50">
                      Seus nichos
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {NICHES.map((n) => {
                        const on = niches.includes(n);
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => toggleNiche(n)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all",
                              on
                                ? "bg-primary/15 text-primary border-primary/40"
                                : "bg-muted/20 text-muted-foreground/50 border-border/15 hover:border-border/30"
                            )}
                          >
                            {on && <X className="inline h-2.5 w-2.5 mr-0.5 -ml-0.5" />}
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground/50">
                        Gênero <span className="text-muted-foreground/30">(opcional)</span>
                      </Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger className="h-11 rounded-xl border-border/15 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground/50">
                        Seguidores <span className="text-muted-foreground/30">(opcional)</span>
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="Ex: 12000"
                        className="rounded-xl h-11 border-border/15 text-sm"
                        value={followers}
                        onChange={(e) => setFollowers(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <Button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish || saving}
                aria-busy={saving}
                className="group w-full rounded-xl h-12 bg-gradient-primary text-white border-0 shadow-lg shadow-primary/25 text-sm font-semibold mt-2 active:scale-[.98] transition-transform ease-[var(--ease-fluid)] disabled:opacity-50 disabled:active:scale-100"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="sr-only">Salvando…</span>
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Começar a usar
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:translate-x-0.5">
                      <Check className="h-3 w-3" />
                    </span>
                  </span>
                )}
              </Button>
            </div>
          )}
          </div>
        </div>
        </div>

        {/* Passo atual textual */}
        <p className="text-center text-[10px] text-white/40 mt-4 uppercase tracking-widest font-semibold">
          Passo {step + 1} de {totalSteps}
        </p>
      </div>
    </div>
  );
}

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
import { Loader2, ChevronLeft, Store, Sparkles, X } from "lucide-react";
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
  const { user, loading: authLoading, updateProfile } = useAuth();
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
    () => (pickedRole === "brand" ? "/brands" : "/inicio"),
    [pickedRole]
  );

  // Sem usuário -> manda pro login.
  if (!authLoading && !user) return <Navigate to="/auth" replace />;
  // Já passou pelo onboarding -> vai pro destino do papel.
  if (!authLoading && user && !needsOnboarding) {
    return <Navigate to={role === "brand" ? "/brands" : "/inicio"} replace />;
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
        // Loja: salva nome da loja como display_name do perfil (fallback demo no catch).
        try {
          await updateProfile({ display_name: storeName.trim() || APP_NAME });
        } catch {
          // demo / sem Supabase — segue
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
        try {
          await updateProfile({ display_name: displayName.trim() || APP_NAME });
        } catch {
          // demo — segue
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
      complete();
      setSaving(false);
      navigate(dest, { replace: true });
    }
  };

  // Validação mínima do passo 3.
  const canFinish =
    pickedRole === "brand"
      ? storeName.trim().length >= 2
      : displayName.trim().length >= 2 && niches.length > 0;

  const totalSteps = 3;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-foreground relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[160px] opacity-[0.06] bg-primary" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + tagline do passo */}
        <div className="text-center mb-7">
          <img
            src={logoImg}
            alt={APP_NAME}
            className="h-14 w-14 mx-auto rounded-2xl object-cover mb-4"
          />
          <h1 className="text-xl font-bold text-white tracking-tight">
            {step === 0 && "Como você vai usar o Only Shop?"}
            {step === 1 && "De onde você fala?"}
            {step === 2 &&
              (pickedRole === "brand" ? "Sobre a sua loja" : "Sobre você")}
          </h1>
          <p className="text-white/25 mt-1.5 text-xs leading-snug px-2">
            {step === 0 && "Escolha seu lado do balcão. Dá pra mudar depois."}
            {step === 1 &&
              "A gente conecta você com quem está perto — match local de verdade."}
            {step === 2 &&
              (pickedRole === "brand"
                ? "Só o básico pra creators acharem sua loja."
                : "Só o básico pra marcas certas chegarem em você.")}
          </p>
        </div>

        <div className="bg-background rounded-3xl p-6 shadow-2xl border border-border/10">
          {/* Progresso dos passos */}
          <div className="flex items-center gap-1.5 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted/40"
                )}
              />
            ))}
          </div>

          {/* Voltar */}
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 mb-4 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
          )}

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
                className="w-full rounded-xl h-12 bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold mt-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Começar a usar"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Passo atual textual */}
        <p className="text-center text-[10px] text-white/20 mt-4 uppercase tracking-widest font-semibold">
          Passo {step + 1} de {totalSteps}
        </p>
      </div>
    </div>
  );
}

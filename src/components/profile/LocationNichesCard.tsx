import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, X, Plus, Check, Navigation, Save } from "lucide-react";

const SUGGESTED_NICHES = [
  "Moda", "Beleza", "Fitness", "Tech", "Casa", "Pet", "Infantil",
  "Gastronomia", "Viagem", "Esporte", "Saúde", "Educação", "Games", "Automotivo",
];

const DEMO_EMAIL = "teste@onlyshop.com";
const isDemoSession = (email?: string | null) =>
  localStorage.getItem("onlyshop_demo_session") === "1" || email === DEMO_EMAIL;
const DEMO_PROFILE_KEY = "onlyshop_demo_profile";

export function LocationNichesCard({ delay = 0 }: { delay?: number }) {
  const { user } = useAuth();
  const { detectAndSave, saveLocation, loading: geoLoading } = useGeolocation();
  const { toast } = useToast();

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      // Modo demo: lê o perfil do localStorage (sem backend).
      if (isDemoSession(user.email)) {
        try {
          const raw = localStorage.getItem(DEMO_PROFILE_KEY);
          if (raw && active) {
            const p = JSON.parse(raw);
            setCity(p.city || "");
            setState(p.state || "");
            setNiches(Array.isArray(p.niches) ? p.niches : []);
            setCategories(Array.isArray(p.categories) ? p.categories : []);
          }
        } catch {
          /* perfil demo ausente/corrompido — segue com campos vazios */
        }
        if (active) setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("city, state, niches, categories")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const p = data as any;
      if (p) {
        setCity(p.city || "");
        setState(p.state || "");
        setNiches(p.niches || []);
        setCategories(p.categories || []);
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const toggleNiche = (n: string) => {
    setNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const addCategory = () => {
    const v = newCategory.trim();
    if (!v || categories.includes(v)) return;
    setCategories([...categories, v]);
    setNewCategory("");
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Modo demo: persiste no localStorage e simula sucesso.
      if (isDemoSession(user.email)) {
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify({ city, state, niches, categories }));
        await new Promise((r) => setTimeout(r, 500));
        toast({ title: "Preferências salvas", description: "Localização e nichos atualizados." });
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ city, state, niches, categories } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await saveLocation({ city, state });
      toast({ title: "Preferências salvas", description: "Localização e nichos atualizados." });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: e?.message ?? "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="animate-slide-up rounded-[1.5rem] border border-border/40 bg-gradient-to-b from-white/[0.05] to-transparent p-[1px]"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="rounded-[1.4rem] bg-card/80 p-5 ring-1 ring-inset ring-white/[0.04] shadow-[var(--shadow-bezel-inset)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
              Match local
            </span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Localização &amp; nichos</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Usado para sugerir marcas próximas com nichos compatíveis.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {!loaded ? (
            // Skeleton de carregamento do perfil — nunca mostra campos crus piscando.
            <div className="space-y-4">
              <div className="h-11 animate-pulse rounded-full bg-muted/40" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-11 animate-pulse rounded-xl bg-muted/40" />
                <div className="h-11 animate-pulse rounded-xl bg-muted/40" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-muted/40" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                className="group h-11 w-full gap-2 rounded-full border-border/30 text-sm transition-transform duration-200 ease-[var(--ease-fluid)] active:scale-[.98]"
                onClick={() => detectAndSave("profile")}
                disabled={geoLoading}
                aria-busy={geoLoading}
              >
                {geoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 text-accent transition-transform duration-200 group-hover:-translate-y-0.5" />
                )}
                Detectar minha localização
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ln-city" className="text-xs font-medium text-muted-foreground/70">
                    Cidade
                  </Label>
                  <Input
                    id="ln-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className="mt-1.5 h-11 rounded-xl border-border/30 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="ln-state" className="text-xs font-medium text-muted-foreground/70">
                    Estado
                  </Label>
                  <Input
                    id="ln-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    className="mt-1.5 h-11 rounded-xl border-border/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground/70">Nichos de atuação</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTED_NICHES.map((n) => {
                    const active = niches.includes(n);
                    return (
                      <Badge
                        key={n}
                        role="button"
                        aria-pressed={active}
                        variant={active ? "default" : "outline"}
                        className={`cursor-pointer select-none gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ease-[var(--ease-fluid)] active:scale-[.95] ${
                          active
                            ? "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/20"
                            : "border-border/40 text-muted-foreground/70 hover:border-border hover:text-foreground"
                        }`}
                        onClick={() => toggleNiche(n)}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {n}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="ln-category" className="text-xs font-medium text-muted-foreground/70">
                  Categorias de interesse
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="ln-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                    placeholder="Ex: cosméticos veganos"
                    className="h-11 rounded-xl border-border/30 text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={addCategory}
                    aria-label="Adicionar categoria"
                    className="h-11 w-11 shrink-0 rounded-xl border-border/30 active:scale-[.95]"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <Badge
                        key={c}
                        variant="secondary"
                        className="gap-1 rounded-full px-3 py-1.5 text-[11px]"
                      >
                        {c}
                        <button
                          type="button"
                          aria-label={`Remover ${c}`}
                          className="grid h-4 w-4 place-items-center rounded-full hover:bg-foreground/10"
                          onClick={() => setCategories(categories.filter((x) => x !== c))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="group h-11 w-full gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow-cta)] transition-all duration-200 ease-[var(--ease-fluid)] active:scale-[.98] disabled:opacity-50 disabled:shadow-none"
                onClick={handleSaveAll}
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="sr-only">Salvando…</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                      <Save className="h-3.5 w-3.5" />
                    </span>
                    Salvar preferências
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

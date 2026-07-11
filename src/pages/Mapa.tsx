import { Suspense, lazy, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation, type GeoLocation } from "@/hooks/useGeolocation";
import { useCampaignsNear } from "@/hooks/useCampaignsNear";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { SocialProofBar } from "@/components/map/SocialProofBar";
import { TerritoryOwnerBar } from "@/components/map/TerritoryOwnerBar";
import { useTerritories } from "@/hooks/useTerritories";
import { CampaignSheet } from "@/components/map/CampaignSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Map as MapIcon, List, Loader2, Navigation, Compass, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignNear } from "@/lib/campaigns";

// Leaflet acessa window e é pesado → carrega só quando o mapa aparece.
const CampaignMap = lazy(() => import("@/components/map/CampaignMap"));

type View = "map" | "list";

export default function Mapa() {
  const { user, loading: authLoading } = useAuth();
  const { loading: geoLoading, requestBrowserLocation, reverseGeocode, forwardGeocode } = useGeolocation();

  // Reaproveita a localização salva no onboarding (não pede de novo).
  const [loc, setLoc] = useState<GeoLocation | null>(() => {
    try {
      const raw = localStorage.getItem("onlyshop_demo_location");
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.lat != null && d?.lon != null) {
          return { latitude: d.lat, longitude: d.lon, city: d.city ?? undefined, state: d.state ?? undefined };
        }
      }
    } catch { /* ignora */ }
    return null;
  });
  const [view, setView] = useState<View>("map");
  const [selected, setSelected] = useState<CampaignNear | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [resolving, setResolving] = useState(false);

  const { campaigns, loading: campaignsLoading } = useCampaignsNear(loc?.latitude, loc?.longitude);
  const { territories } = useTerritories(loc?.latitude, loc?.longitude);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  // GPS do navegador.
  const detectGps = async () => {
    setResolving(true);
    try {
      const geo = await requestBrowserLocation();
      if (geo) {
        const addr = await reverseGeocode(geo.latitude, geo.longitude);
        setLoc({ ...geo, ...addr });
      }
    } finally {
      setResolving(false);
    }
  };

  // Cidade digitada (pra quem nega o GPS).
  const detectCity = async () => {
    if (!city.trim()) return;
    setResolving(true);
    try {
      const geo = await forwardGeocode(city.trim(), stateUf.trim() || undefined);
      if (geo) setLoc(geo);
    } finally {
      setResolving(false);
    }
  };

  const openCampaign = (c: CampaignNear) => {
    setSelected(c);
    setSheetOpen(true);
  };

  // Volta pro prompt de localização (usado no empty state do mapa).
  const changeLocation = () => {
    setLoc(null);
    setCity("");
    setStateUf("");
  };

  // Sem localização ainda → prompt pra detectar/digitar.
  if (!loc) {
    return (
      <div className="max-w-md mx-auto py-6 animate-fade-in">
        <LocationPrompt
          onDetect={detectGps}
          onCity={detectCity}
          city={city}
          setCity={setCity}
          stateUf={stateUf}
          setStateUf={setStateUf}
          loading={resolving || geoLoading}
        />
      </div>
    );
  }

  const empty = campaigns.length === 0;

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-4">
      {/* cabeçalho */}
      <div className="flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary ring-1 ring-white/10 flex items-center justify-center shrink-0 shadow-[var(--shadow-glow-cta)]">
            <Compass className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-none">Perto de você</h1>
            <p className="text-xs text-muted-foreground/60 truncate mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {loc.city ? `${loc.city}${loc.state ? `, ${loc.state}` : ""}` : "Sua região"}
            </p>
          </div>
        </div>

        {/* toggle mapa / lista */}
        <div className="flex items-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] p-1 shrink-0">
          <ToggleBtn active={view === "map"} onClick={() => setView("map")} icon={<MapIcon className="h-3.5 w-3.5" />} label="Mapa" />
          <ToggleBtn active={view === "list"} onClick={() => setView("list")} icon={<List className="h-3.5 w-3.5" />} label="Lista" />
        </div>
      </div>

      {campaignsLoading ? (
        <MapLoadingSkeleton view={view} />
      ) : (
        <>
          <SocialProofBar campaigns={campaigns} />
          {territories.length > 0 && (
            <div className="mt-3"><TerritoryOwnerBar territories={territories} /></div>
          )}

          {view === "map" ? (
            <div
              className="relative w-full overflow-hidden rounded-3xl ring-1 ring-white/[0.08] animate-fade-in"
              style={{ height: "min(62vh, 560px)" }}
            >
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  </div>
                }
              >
                <CampaignMap
                  userLat={loc.latitude}
                  userLon={loc.longitude}
                  campaigns={campaigns}
                  onSelect={openCampaign}
                />
              </Suspense>

              {/* legenda — canto superior direito (não cobre o pino central do usuário) */}
              <div className="absolute top-3 right-3 z-[400] flex gap-2 text-[10px]">
                <span className="flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur px-2.5 py-1.5 text-white ring-1 ring-white/10">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Você
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur px-2.5 py-1.5 text-white ring-1 ring-white/10">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Campanha
                </span>
              </div>

              {/* empty state sobreposto: cidade sem campanha não pode ser um quadrado preto mudo */}
              {empty && (
                <div className="absolute inset-0 z-[401] flex items-center justify-center bg-black/55 backdrop-blur-sm p-6 animate-fade-in">
                  <MapEmpty onChangeLocation={changeLocation} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              {empty ? (
                <ListEmpty onChangeLocation={changeLocation} />
              ) : (
                campaigns.map((c, i) => (
                  <div key={c.campaign_id} className="animate-slide-up opacity-0" style={{ animationDelay: `${i * 50}ms` }}>
                    <CampaignCard
                      c={c}
                      onClick={() => openCampaign(c)}
                      ctaLabel="Aceitar campanha"
                      onCta={() => openCampaign(c)}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <CampaignSheet campaign={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function ToggleBtn({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 min-h-[40px] text-xs font-semibold transition-all duration-300 ease-[var(--ease-fluid)] active:scale-[.96]",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow-cta)]"
          : "text-muted-foreground/70 hover:text-foreground"
      )}
    >
      {icon} {label}
    </button>
  );
}

// Estado de vazio do MAPA (overlay) — mesmo tom do empty da lista, pra consistência.
function MapEmpty({ onChangeLocation }: { onChangeLocation: () => void }) {
  return (
    <div className="text-center max-w-xs">
      <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-4">
        <Compass className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-base font-bold tracking-tight text-white">Nenhuma campanha aqui ainda</h2>
      <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
        Assim que uma marca pagar perto de você, o pino aparece no mapa.
      </p>
      <Button
        variant="outline"
        className="group mt-5 rounded-full gap-2 border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] active:scale-[.98] transition-all duration-300 ease-[var(--ease-fluid)]"
        onClick={onChangeLocation}
      >
        Mudar localização
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:translate-x-0.5">
          <ArrowRight className="h-3 w-3" />
        </span>
      </Button>
    </div>
  );
}

// Estado de vazio da LISTA — caprichado (ícone em círculo + CTA com ícone aninhado).
function ListEmpty({ onChangeLocation }: { onChangeLocation: () => void }) {
  return (
    <div className="rounded-[1.5rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-8 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-4">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-base font-bold tracking-tight">Nenhuma campanha perto agora</h2>
      <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto leading-relaxed">
        Volte mais tarde ou troque de localização — marcas novas pagam por aqui o tempo todo.
      </p>
      <Button
        variant="outline"
        className="group mt-5 rounded-full gap-2 border-border/40 active:scale-[.98] transition-all duration-300 ease-[var(--ease-fluid)]"
        onClick={onChangeLocation}
      >
        Mudar localização
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:translate-x-0.5">
          <ArrowRight className="h-3 w-3" />
        </span>
      </Button>
    </div>
  );
}

// Skeleton premium: espelha SocialProofBar + a área do mapa/lista (sem piscar o layout).
function MapLoadingSkeleton({ view }: { view: View }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* skeleton da social proof bar */}
      <div className="rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px">
        <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-4">
          <div className="h-4 w-40 rounded-full bg-white/[0.06] animate-pulse mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] px-3 py-2.5">
                <div className="h-5 w-14 mx-auto rounded bg-white/[0.06] animate-pulse" />
                <div className="h-2.5 w-12 mx-auto rounded bg-white/[0.04] animate-pulse mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div
          className="relative w-full overflow-hidden rounded-3xl ring-1 ring-white/[0.08] bg-[#0a0a0c]"
          style={{ height: "min(62vh, 560px)" }}
        >
          {/* shimmer sutil com a paleta magenta/cyan */}
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_30%,hsl(346_100%_58%/0.08),transparent),radial-gradient(60%_50%_at_70%_70%,hsl(174_100%_47%/0.08),transparent)] animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[1.5rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/5 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-2.5 w-2/5 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="h-6 w-14 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationPrompt({
  onDetect, onCity, city, setCity, stateUf, setStateUf, loading,
}: {
  onDetect: () => void;
  onCity: () => void;
  city: string;
  setCity: (v: string) => void;
  stateUf: string;
  setStateUf: (v: string) => void;
  loading: boolean;
}) {
  return (
    // double-bezel: casca com gradiente de borda + núcleo OLED
    <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.08] to-transparent p-px shadow-[0_24px_80px_-24px_hsl(346_100%_58%/0.25)]">
      <div className="rounded-[calc(1.75rem-1px)] bg-card/90 backdrop-blur-xl p-6 text-center overflow-hidden relative">
        {/* orbs ambiente magenta ↔ cyan */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-56 h-56 rounded-full blur-[120px] opacity-[0.12] bg-primary" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-56 h-56 rounded-full blur-[120px] opacity-[0.08] bg-accent" />

        <div className="relative">
          <span className="inline-block text-[10px] uppercase tracking-[0.2em] text-primary/70 font-semibold mb-3">
            Conecta localizado
          </span>
          <div className="mx-auto h-14 w-14 rounded-3xl bg-gradient-primary ring-1 ring-white/10 flex items-center justify-center mb-4 shadow-[var(--shadow-glow-cta)]">
            <MapPin className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Onde você está?</h1>
          <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto leading-relaxed">
            A gente mostra as campanhas que estão pagando perto de você no mapa. Comece pela sua localização.
          </p>

          <Button
            size="lg"
            className="group w-full mt-5 h-12 rounded-full gap-2 bg-gradient-primary border-0 font-semibold shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-all duration-300 ease-[var(--ease-fluid)]"
            onClick={onDetect}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            Usar minha localização
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">ou digite sua cidade</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-3 text-left">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="city" className="text-[11px] text-muted-foreground/70">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Ex: Sorocaba"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onCity()}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uf" className="text-[11px] text-muted-foreground/70">UF</Label>
                <Input
                  id="uf"
                  placeholder="SP"
                  maxLength={2}
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && onCity()}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full h-11 rounded-full border-border/40 active:scale-[.98] transition-all duration-300 ease-[var(--ease-fluid)]"
              onClick={onCity}
              disabled={loading || !city.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver campanhas nessa cidade"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

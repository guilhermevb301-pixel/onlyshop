import { Suspense, lazy, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation, type GeoLocation } from "@/hooks/useGeolocation";
import { useCampaignsNear } from "@/hooks/useCampaignsNear";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { SocialProofBar } from "@/components/map/SocialProofBar";
import { CampaignSheet } from "@/components/map/CampaignSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Map as MapIcon, List, Loader2, Navigation, Compass } from "lucide-react";
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
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

  // Sem localização ainda → prompt pra detectar/digitar.
  if (!loc) {
    return (
      <div className="max-w-md mx-auto py-6">
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

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-4">
      {/* cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
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
        <div className="flex items-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] p-0.5 shrink-0">
          <ToggleBtn active={view === "map"} onClick={() => setView("map")} icon={<MapIcon className="h-3.5 w-3.5" />} label="Mapa" />
          <ToggleBtn active={view === "list"} onClick={() => setView("list")} icon={<List className="h-3.5 w-3.5" />} label="Lista" />
        </div>
      </div>

      <SocialProofBar campaigns={campaigns} />

      {campaignsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
        </div>
      ) : view === "map" ? (
        <div
          className="relative w-full overflow-hidden rounded-3xl ring-1 ring-white/[0.06]"
          style={{ height: "min(62vh, 560px)" }}
        >
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
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
          {/* legenda */}
          <div className="absolute bottom-3 left-3 z-[400] flex gap-2 text-[10px]">
            <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-1 text-white">
              <span className="h-2 w-2 rounded-full bg-primary" /> Você
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-1 text-white">
              <span className="h-2 w-2 rounded-full bg-accent" /> Campanha
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-xs text-muted-foreground/50">
              Nenhuma campanha perto de você agora. Volte mais tarde.
            </div>
          ) : (
            campaigns.map((c) => (
              <CampaignCard
                key={c.campaign_id}
                c={c}
                onClick={() => openCampaign(c)}
                ctaLabel="Aceitar campanha"
                onCta={() => openCampaign(c)}
              />
            ))
          )}
        </div>
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
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground/70 hover:text-foreground"
      )}
    >
      {icon} {label}
    </button>
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
    <Card className="border-border/30 overflow-hidden">
      <CardContent className="p-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-3xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4">
          <MapPin className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">Onde você está?</h1>
        <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">
          A gente mostra as campanhas que estão pagando perto de você no mapa. Comece pela sua localização.
        </p>

        <Button
          size="lg"
          className="w-full mt-5 rounded-full gap-2 bg-gradient-primary border-0 font-semibold"
          onClick={onDetect}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          Usar minha localização
        </Button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-muted-foreground/40">ou digite sua cidade</span>
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
            className="w-full rounded-full"
            onClick={onCity}
            disabled={loading || !city.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver campanhas nessa cidade"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

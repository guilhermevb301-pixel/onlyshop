import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation, type GeoLocation } from "@/hooks/useGeolocation";
import { isDemoSession } from "@/lib/onboarding";

interface LocationStepProps {
  onDone: (loc: GeoLocation) => void;
  // Onde salvar a localização (perfil do influencer ou marca da loja).
  target?: "profile" | "brand";
}

const DEMO_LOCATION_KEY = "onlyshop_demo_location";

// Persiste a localização da demo no localStorage (sem Supabase).
function saveDemoLocation(loc: GeoLocation) {
  try {
    localStorage.setItem(
      DEMO_LOCATION_KEY,
      JSON.stringify({
        city: loc.city ?? null,
        state: loc.state ?? null,
        lat: loc.latitude,
        lon: loc.longitude,
      })
    );
  } catch {
    // ignora — localStorage indisponível
  }
}

export default function LocationStep({ onDone, target = "profile" }: LocationStepProps) {
  const { loading, detectAndSave, reverseGeocode, forwardGeocode, requestBrowserLocation } =
    useGeolocation();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [resolved, setResolved] = useState<GeoLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemo = isDemoSession();

  // Detectar via GPS do navegador.
  const handleDetect = async () => {
    setError(null);
    setBusy(true);
    try {
      if (isDemo) {
        // Demo: não chama Supabase (saveLocation) — resolve direto do navegador.
        const geo = await requestBrowserLocation();
        if (!geo) {
          setError("Não foi possível detectar. Preencha cidade e estado.");
          return;
        }
        const addr = await reverseGeocode(geo.latitude, geo.longitude);
        const full: GeoLocation = { ...geo, ...addr };
        saveDemoLocation(full);
        setResolved(full);
        if (full.city) setCity(full.city);
        if (full.state) setState(full.state);
      } else {
        const full = await detectAndSave(target);
        if (!full) {
          setError("Não foi possível detectar. Preencha cidade e estado.");
          return;
        }
        setResolved(full);
        if (full.city) setCity(full.city);
        if (full.state) setState(full.state);
      }
    } finally {
      setBusy(false);
    }
  };

  // Resolver coordenadas a partir de cidade/estado digitados.
  const handleManual = async () => {
    if (!city.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const geo = await forwardGeocode(city.trim(), state.trim() || undefined);
      if (!geo) {
        setError("Não achamos essa cidade. Confira o nome e tente de novo.");
        return;
      }
      if (isDemo) saveDemoLocation(geo);
      setResolved(geo);
    } finally {
      setBusy(false);
    }
  };

  const working = busy || loading;

  return (
    <div className="space-y-4">
      {/* Detectar localização */}
      <Button
        type="button"
        onClick={handleDetect}
        disabled={working}
        className="w-full rounded-xl h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold"
      >
        {working ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4" />
        )}
        Detectar minha localização
      </Button>

      {/* Divisor */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/15" />
        <span className="text-[10px] text-muted-foreground/30 uppercase tracking-widest font-semibold">
          ou digite
        </span>
        <div className="h-px flex-1 bg-border/15" />
      </div>

      {/* Entrada manual */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="loc-city" className="text-[11px] text-muted-foreground/50">
            Cidade
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
            <Input
              id="loc-city"
              placeholder="Ex: Sorocaba"
              className="pl-10 rounded-xl h-11 border-border/15 text-sm"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setResolved(null);
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-state" className="text-[11px] text-muted-foreground/50">
            Estado (UF)
          </Label>
          <Input
            id="loc-state"
            placeholder="Ex: SP"
            maxLength={2}
            className="rounded-xl h-11 border-border/15 text-sm uppercase"
            value={state}
            onChange={(e) => {
              setState(e.target.value.toUpperCase());
              setResolved(null);
            }}
          />
        </div>

        {!resolved && (
          <Button
            type="button"
            variant="outline"
            onClick={handleManual}
            disabled={working || !city.trim()}
            className="w-full rounded-xl h-11 border-border/15 text-xs bg-transparent hover:bg-muted/30"
          >
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar cidade"}
          </Button>
        )}
      </div>

      {error && <p className="text-[11px] text-destructive text-center">{error}</p>}

      {/* Confirmação de localização resolvida */}
      {resolved && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                {resolved.city
                  ? `${resolved.city}${resolved.state ? `, ${resolved.state}` : ""}`
                  : "Localização confirmada"}
              </p>
              <p className="text-[10px] text-muted-foreground/40">
                {resolved.latitude.toFixed(3)}, {resolved.longitude.toFixed(3)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => onDone(resolved)}
            className={cn(
              "w-full rounded-xl h-11 text-sm font-semibold",
              "bg-accent text-accent-foreground hover:bg-accent/90"
            )}
          >
            Continuar
          </Button>
        </div>
      )}
    </div>
  );
}

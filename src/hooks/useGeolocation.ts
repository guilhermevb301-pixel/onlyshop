import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}

/**
 * Captura geolocalização: tenta browser API; usuário pode salvar manualmente cidade/estado.
 */
export function useGeolocation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const requestBrowserLocation = useCallback((): Promise<GeoLocation | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    });
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<{ city?: string; state?: string }> => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=pt-BR`,
        { headers: { "Accept": "application/json" } }
      );
      const d = await r.json();
      return {
        city: d.address?.city || d.address?.town || d.address?.village,
        state: d.address?.state,
      };
    } catch {
      return {};
    }
  }, []);

  // Cidade/estado -> coordenadas (pra quem nega o GPS mas quer aparecer no mapa).
  const forwardGeocode = useCallback(async (city: string, state?: string): Promise<GeoLocation | null> => {
    try {
      const q = encodeURIComponent([city, state, "Brasil"].filter(Boolean).join(", "));
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=pt-BR`,
        { headers: { Accept: "application/json" } }
      );
      const d = await r.json();
      if (!d?.[0]) return null;
      return { latitude: parseFloat(d[0].lat), longitude: parseFloat(d[0].lon), city, state };
    } catch {
      return null;
    }
  }, []);

  const saveLocation = useCallback(
    async (loc: Partial<GeoLocation> & { target?: "profile" | "brand"; brand_id?: string }) => {
      if (!user) return;
      setLoading(true);
      try {
        const target = loc.target || "profile";
        const payload: Record<string, unknown> = {};
        if (loc.latitude != null) payload.latitude = loc.latitude;
        if (loc.longitude != null) payload.longitude = loc.longitude;
        if (loc.city) payload.city = loc.city;
        if (loc.state) payload.state = loc.state;

        if (target === "brand" && loc.brand_id) {
          const { error } = await supabase.from("brands").update(payload as any).eq("id", loc.brand_id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("profiles").update(payload as any).eq("user_id", user.id);
          if (error) throw error;
        }
        toast({ title: "Localização salva!" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const detectAndSave = useCallback(
    async (target: "profile" | "brand" = "profile", brand_id?: string) => {
      const geo = await requestBrowserLocation();
      if (!geo) {
        toast({
          variant: "destructive",
          title: "Não foi possível detectar",
          description: "Preencha cidade e estado manualmente.",
        });
        return null;
      }
      const addr = await reverseGeocode(geo.latitude, geo.longitude);
      const full = { ...geo, ...addr };
      await saveLocation({ ...full, target, brand_id });
      return full;
    },
    [requestBrowserLocation, reverseGeocode, saveLocation, toast]
  );

  return { loading, requestBrowserLocation, reverseGeocode, forwardGeocode, saveLocation, detectAndSave };
}

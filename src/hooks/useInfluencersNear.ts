import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { InfluencerNear } from "@/lib/campaigns";

// Influenciadores ativos perto (RPC influencers_near, SECURITY DEFINER — leitura
// pública de vitrine). Áudio 3 do Biel: o mapa mostra quem está próximo.
export function useInfluencersNear(lat?: number, lon?: number, radiusKm = 100) {
  const [influencers, setInfluencers] = useState<InfluencerNear[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lon == null) { setInfluencers([]); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("influencers_near" as any, { _lat: lat, _lon: lon, _radius_km: radiusKm });
        if (alive) setInfluencers(((data as any[]) || []) as InfluencerNear[]);
      } catch {
        if (alive) setInfluencers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [lat, lon, radiusKm]);

  return { influencers, loading };
}

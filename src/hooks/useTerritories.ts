import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Territory } from "@/lib/campaigns";

// Territórios perto (dono da rua/bairro/cidade/zona). RPC territories_near.
// Sem lat/lon => vazio. Erro => vazio (degrada, não quebra a tela).
export function useTerritories(lat?: number | null, lon?: number | null, scope?: string | null) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (lat == null || lon == null) { setTerritories([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase.rpc("territories_near" as any, {
        _lat: lat, _lon: lon, _radius_km: 50, _scope: scope ?? null, _limit: 30,
      } as any);
      setTerritories(((data as any[]) || []) as Territory[]);
    } catch (e) {
      console.error("useTerritories:", e);
      setTerritories([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, scope]);

  useEffect(() => { refetch(); }, [refetch]);
  return { territories, loading, refetch };
}

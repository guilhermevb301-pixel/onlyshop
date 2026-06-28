import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type CampaignNear } from "@/lib/campaigns";

// Campanhas perto do usuário (o coração do MVP). Lê a RPC campaigns_near do
// Supabase — APENAS dados reais. Sem localização ou sem campanhas reais → lista
// vazia (a tela mostra o empty state). Nunca exibe exemplos fictícios.
export function useCampaignsNear(lat?: number | null, lon?: number | null, radiusKm = 100) {
  const [campaigns, setCampaigns] = useState<CampaignNear[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNear = useCallback(async () => {
    setLoading(true);
    try {
      if (lat == null || lon == null) { setCampaigns([]); return; }
      const { data, error } = await supabase.rpc("campaigns_near" as any, {
        _lat: lat, _lon: lon, _radius_km: radiusKm, _limit: 50,
      } as any);
      if (error) throw error;
      setCampaigns((data as CampaignNear[]) || []);
    } catch {
      setCampaigns([]); // erro → lista vazia, NUNCA dados fictícios
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => { fetchNear(); }, [fetchNear]);

  return { campaigns, loading, refetch: fetchNear };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { demoCampaigns, type CampaignNear } from "@/lib/campaigns";

// Campanhas perto do usuário (o coração do MVP). Tenta a RPC campaigns_near;
// se o backend não estiver deployado / vazio, cai nos exemplos demo (distância real).
export function useCampaignsNear(lat?: number | null, lon?: number | null, radiusKm = 100) {
  const [campaigns, setCampaigns] = useState<CampaignNear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchNear = useCallback(async () => {
    setLoading(true);
    try {
      if (lat == null || lon == null) throw new Error("sem localização");
      const { data, error } = await supabase.rpc("campaigns_near" as any, {
        _lat: lat, _lon: lon, _radius_km: radiusKm, _limit: 50,
      } as any);
      if (error) throw error;
      const rows = (data as CampaignNear[]) || [];
      if (rows.length) { setCampaigns(rows); setIsDemo(false); }
      else { setCampaigns(demoCampaigns(lat, lon)); setIsDemo(true); }
    } catch {
      setCampaigns(demoCampaigns(lat, lon));
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => { fetchNear(); }, [fetchNear]);

  return { campaigns, loading, isDemo, refetch: fetchNear };
}

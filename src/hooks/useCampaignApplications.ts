import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  demo, demoId, computeSplit, type CampaignApplication, type CampaignNear,
} from "@/lib/campaigns";

// Candidaturas do influencer + saldo. Demo grava em localStorage; real no Supabase.
export function useCampaignApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        setApplications([]);
        setBalance(0);
        return;
      }
      // Traz também os dados da campanha (nome, valor, marca) — senão "Meus ganhos"
      // mostra "Campanha" genérica e R$ 0,00.
      const { data } = await supabase
        .from("campaign_applications" as any)
        .select("*, campaigns(name, reward_amount, physical_item, brand_id, brands(name))")
        .eq("influencer_user_id", user.id)
        .order("created_at", { ascending: false });
      const mapped = ((data as any[]) || []).map((a) => ({
        ...a,
        campaign: {
          title: a.campaigns?.name ?? null,
          reward_amount: Number(a.campaigns?.reward_amount ?? 0),
          physical_item: a.campaigns?.physical_item ?? null,
          brand_name: a.campaigns?.brands?.name ?? null,
          distance_km: a.distance_km ?? null,
        },
      }));
      setApplications(mapped as unknown as CampaignApplication[]);
      const { data: credits } = await supabase
        .from("platform_credits" as any)
        .select("amount")
        .eq("user_id", user.id);
      setBalance(((credits as any[]) || []).reduce((s, c) => s + Number(c.amount || 0), 0));
    } catch {
      setApplications([]);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Influencer aceita/candidata a uma campanha.
  const apply = useCallback(async (c: CampaignNear): Promise<boolean> => {
    const now = new Date().toISOString();
    const app: CampaignApplication = {
      id: demoId("app"),
      campaign_id: c.campaign_id,
      influencer_user_id: user?.id || "demo",
      status: "accepted",
      distance_km: c.distance_km,
      created_at: now,
      updated_at: now,
      campaign: { brand_name: c.brand_name, title: c.title, reward_amount: c.reward_amount, physical_item: c.physical_item, distance_km: c.distance_km },
    };
    if (demo.isOn() || !user) { demo.addApp(app); await refresh(); return true; }
    try {
      const { error } = await supabase.from("campaign_applications" as any).insert({
        campaign_id: c.campaign_id, influencer_user_id: user.id, status: "accepted", distance_km: c.distance_km,
      } as any);
      if (error) throw error;
      await refresh();
      return true;
    } catch {
      return false; // erro real → não finge que aceitou
    }
  }, [user, refresh]);

  // Influencer envia o link da entrega (vídeo postado no canal dele).
  const submitDelivery = useCallback(async (appId: string, url: string): Promise<void> => {
    if (demo.isOn() || !user) { demo.updateApp(appId, { status: "delivered", delivery_url: url }); await refresh(); return; }
    try {
      await supabase.from("campaign_applications" as any)
        .update({ status: "delivered", delivery_url: url, updated_at: new Date().toISOString() } as any)
        .eq("id", appId);
      await refresh();
    } catch (e) {
      console.error("submitDelivery:", e);
      throw e; // erro real → o caller mostra a falha (não finge entrega)
    }
  }, [user, refresh]);

  return { applications, balance, loading, apply, submitDelivery, refresh, computeSplit };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  demo, demoId, computeSplit, type CampaignApplication, type CampaignNear,
} from "@/lib/campaigns";

// Candidaturas do influencer + saldo. Demo grava em localStorage; real no Supabase.
export function useCampaignApplications() {
  const { user, userRole } = useAuth();
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
      const { data } = await supabase
        .from("campaign_applications" as any)
        .select("*")
        .eq("influencer_user_id", user.id)
        .order("created_at", { ascending: false });
      const apps = ((data as any[]) || []);
      // Enriquece via N+1 (NÃO embed): o embed campaigns(...) retorna NULL pro
      // influencer (só service_role resolve) → era o bug "Campanha / R$ 0,00" em
      // Meus ganhos. A leitura direta de campaigns é pública, então funciona.
      const cids = [...new Set(apps.map((a) => a.campaign_id).filter(Boolean))];
      const cmap = new Map<string, any>();
      if (cids.length) {
        const { data: camps } = await supabase
          .from("campaigns" as any)
          .select("id, name, reward_amount, reward_type, physical_item, brand_id")
          .in("id", cids);
        const bids = [...new Set(((camps as any[]) || []).map((c) => c.brand_id).filter(Boolean))];
        const bmap = new Map<string, string>();
        if (bids.length) {
          const { data: brs } = await supabase.from("brands" as any).select("id, name").in("id", bids);
          ((brs as any[]) || []).forEach((b) => bmap.set(b.id, b.name));
        }
        ((camps as any[]) || []).forEach((c) => cmap.set(c.id, { ...c, brand_name: bmap.get(c.brand_id) ?? null }));
      }
      const mapped = apps.map((a) => {
        const c = cmap.get(a.campaign_id);
        return {
          ...a,
          campaign: {
            title: c?.name ?? null,
            reward_amount: Number(c?.reward_amount ?? 0),
            reward_type: c?.reward_type ?? "per_video",
            physical_item: c?.physical_item ?? null,
            brand_name: c?.brand_name ?? null,
            distance_km: a.distance_km ?? null,
          },
        };
      });
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
    // Marca não aceita campanha (só cria) — a RLS já barra no banco; isto evita
    // o request e dá feedback caso a UI seja driblada.
    if (userRole?.role === "brand") return false;
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
  }, [user, userRole, refresh]);

  // Influencer envia/edita a entrega: vários links de comprovação + comentário.
  // Editável até a marca aprovar (postou errado, vídeo flopou → repostar/trocar).
  const submitDelivery = useCallback(async (appId: string, links: string[], comment = ""): Promise<void> => {
    const clean = links.map((l) => l.trim()).filter(Boolean);
    const primary = clean[0] || null;
    const proofs = { links: clean, comment: comment.trim() || undefined };
    const now = new Date().toISOString();
    if (demo.isOn() || !user) {
      demo.updateApp(appId, { status: "delivered", delivery_url: primary, proofs });
      await refresh();
      return;
    }
    try {
      await supabase.from("campaign_applications" as any)
        .update({ status: "delivered", delivery_url: primary, proofs, posted_at: now, updated_at: now } as any)
        .eq("id", appId);
      await refresh();
    } catch (e) {
      console.error("submitDelivery:", e);
      throw e; // erro real → o caller mostra a falha (não finge entrega)
    }
  }, [user, refresh]);

  return { applications, balance, loading, apply, submitDelivery, refresh, computeSplit };
}

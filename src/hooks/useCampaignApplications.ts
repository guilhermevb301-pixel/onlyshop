import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  demo, demoId, computeSplit, type CampaignApplication, type CampaignNear, withdrawableBalance } from "@/lib/campaigns";

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
          .select("id, name, reward_amount, reward_type, physical_item, brand_id, campaign_kind, phases")
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
            campaign_kind: c?.campaign_kind ?? "standard",
            phases: c?.phases ?? {},
          },
        };
      });
      setApplications(mapped as unknown as CampaignApplication[]);
      const { data: credits } = await supabase
        .from("platform_credits" as any)
        .select("amount,kind,status")
        .eq("user_id", user.id);
      setBalance(withdrawableBalance((credits as any[]) || []));
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
      // A MARCA aprova o perfil antes de virar contratação (pedido do Biel). Só entra
      // direto como "accepted" se ela ligou auto_accept ("contratar todos").
      let autoAccept = false;
      let kind = "standard";
      try {
        const { data: camp } = await supabase.from("campaigns" as any).select("auto_accept, campaign_kind").eq("id", c.campaign_id).maybeSingle();
        autoAccept = (camp as any)?.auto_accept === true;
        kind = (camp as any)?.campaign_kind ?? "standard";
      } catch { /* na dúvida, exige aprovação da marca */ }

      const { error } = await supabase.from("campaign_applications" as any).insert({
        campaign_id: c.campaign_id, influencer_user_id: user.id,
        status: autoAccept ? "accepted" : "applied", distance_km: c.distance_km,
      } as any);
      if (error) throw error;

      // "Ganhe no Processo": a CONEXÃO (R$20) só é paga quando o perfil está ACEITO.
      // Se ficou como interesse ("applied"), o payout vem quando a marca aprovar.
      if (autoAccept && kind === "process") {
        try {
          const { data: appRow } = await supabase.from("campaign_applications" as any)
            .select("id").eq("campaign_id", c.campaign_id).eq("influencer_user_id", user.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const aid = (appRow as any)?.id;
          if (aid) {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch("/api/payout-process", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify({ applicationId: aid, phase: "connection" }) });
          }
        } catch { /* best-effort, não bloqueia */ }
      }
      await refresh();
      return true;
    } catch {
      return false; // erro real → não finge que aceitou
    }
  }, [user, userRole, refresh]);

  // "Ganhe no Processo": afiliado envia comprovante de um vídeo/dia de live e dispara
  // o payout da etapa (o servidor valida funded/comprovante/CAP). index = nº do vídeo/dia.
  const submitPhaseProof = useCallback(async (appId: string, phase: "video" | "live", index: number, url: string): Promise<boolean> => {
    if (!user) return false;
    try {
      // 1) acrescenta o comprovante no array da fase (proofs.videos / proofs.lives)
      const { data: appRow } = await supabase.from("campaign_applications" as any).select("proofs").eq("id", appId).maybeSingle();
      const proofs = ((appRow as any)?.proofs as any) || {};
      const key = phase === "video" ? "videos" : "lives";
      const arr: string[] = Array.isArray(proofs[key]) ? [...proofs[key]] : [];
      arr[index - 1] = url.trim();
      const nextProofs = { ...proofs, [key]: arr };
      await supabase.from("campaign_applications" as any).update({ proofs: nextProofs, updated_at: new Date().toISOString() } as any).eq("id", appId);
      // 2) dispara o payout da etapa
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/payout-process", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify({ applicationId: appId, phase, index }) });
      await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [user, refresh]);

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
      // Auto-aprovação (opt-in da marca): se a campanha é auto_approve, dispara a
      // aprovação/pagamento na hora. O SERVIDOR revalida tudo (auto_approve, funded,
      // delivered, dono, comprovante). Best-effort: se não for auto ou falhar, a
      // entrega segue como "delivered" pra revisão manual — nunca bloqueia a entrega.
      try {
        if (clean.length) {
          const { data: appRow } = await supabase.from("campaign_applications" as any).select("campaign_id").eq("id", appId).maybeSingle();
          const cid = (appRow as any)?.campaign_id;
          if (cid) {
            const { data: camp } = await supabase.from("campaigns" as any).select("auto_approve").eq("id", cid).maybeSingle();
            if ((camp as any)?.auto_approve) {
              const { data: { session } } = await supabase.auth.getSession();
              await fetch("/api/approve-delivery", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
                body: JSON.stringify({ applicationId: appId }),
              });
            }
          }
        }
      } catch { /* auto-approve é best-effort — não derruba a entrega */ }
      await refresh();
    } catch (e) {
      console.error("submitDelivery:", e);
      throw e; // erro real → o caller mostra a falha (não finge entrega)
    }
  }, [user, refresh]);

  return { applications, balance, loading, apply, submitDelivery, submitPhaseProof, refresh, computeSplit };
}

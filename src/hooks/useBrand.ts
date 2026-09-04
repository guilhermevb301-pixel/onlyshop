import { useState, useEffect, useCallback } from "react";
import { splitLive } from "@/lib/splitMode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeBrandWebsiteDomain, validateBrandWebsiteDomain } from "@/lib/urlValidation";
import {
  demo, demoId,
  type Campaign, type CampaignApplication,
  PLATFORM_FEE_PCT, computeBudget, computeSplit, computePermutaBudget,
  computeProcessBudget, PROCESS_PHASES_DEFAULT,
} from "@/lib/campaigns";

// Marca do lojista. Demo grava em localStorage; real em brands (Supabase).
export interface Brand {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  verified: boolean;
  status: string;
  created_at: string;
  team_invite_code?: string | null; // Fase 2: link de convite do time
  plan_tier?: string | null;        // CRM: plano de gestão (none/inicio/starter/pro/scale/custom)
  plan_status?: string | null;      // none/trial/active/past_due/cancelled
  plan_selected_at?: string | null;
}

// Re-exporta o contrato canônico — quem importa Campaign daqui pega o mesmo de @/lib/campaigns.
export type { Campaign } from "@/lib/campaigns";

// Compat: tipo legado usado por componentes antigos de produto (ProductCard/EditProductSheet,
// fora do modelo de campanha localizada). Mantido só pra não quebrar a compilação deles.
export interface Product {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  price: number;
  currency: string;
  commission_type: string;
  commission_value: number;
  category: string | null;
  active: boolean;
  promo_materials: any;
  created_at: string;
}

// Input do lojista ao criar um gig (campanha localizada).
export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  briefing?: string | null;              // exigências da campanha (o que o influencer precisa fazer)
  reward_type?: Campaign["reward_type"]; // "per_video" (paga) | "permuta"
  reward_amount: number;                 // R$ por influencer (paga) · 0 na permuta
  slots: number;
  target_city?: string | null;
  target_state?: string | null;
  target_gender: Campaign["target_gender"];
  min_followers: number;
  deadline_hours: number;
  physical_item?: string | null;
  territory_scope?: Campaign["territory_scope"];
  territory_name?: string | null;
  territory_neighborhood?: string | null;
  territory_street?: string | null;
  auto_approve?: boolean; // aprova/paga automático ao postar (opt-in da marca)
  auto_accept?: boolean;  // aceita todo candidato sem curadoria
  campaign_kind?: Campaign["campaign_kind"]; // "process" = Ganhe no Processo
  phases?: Campaign["phases"];
}

const DEMO_BRAND_KEY = "onlyshop_demo_brand";

function readDemoBrand(): Brand | null {
  try {
    const r = localStorage.getItem(DEMO_BRAND_KEY);
    return r ? (JSON.parse(r) as Brand) : null;
  } catch {
    return null;
  }
}
function writeDemoBrand(b: Brand) {
  localStorage.setItem(DEMO_BRAND_KEY, JSON.stringify(b));
}

export function useBrand() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async (brandId: string) => {
    if (demo.isOn()) {
      setCampaigns(demo.myCampaigns().filter((c) => c.brand_id === brandId));
      return;
    }
    try {
      const { data } = await supabase
        .from("campaigns" as any)
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });
      setCampaigns(((data as unknown as Campaign[]) || []));
    } catch {
      setCampaigns([]);
    }
  }, []);

  // Candidaturas recebidas (em todas as campanhas da marca) — pra aprovar entregas.
  const fetchApplications = useCallback(async (campaignIds: string[]) => {
    if (campaignIds.length === 0) { setApplications([]); return; }
    if (demo.isOn()) {
      setApplications(demo.apps().filter((a) => campaignIds.includes(a.campaign_id)));
      return;
    }
    try {
      const { data } = await supabase
        .from("campaign_applications" as any)
        .select("*")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false });
      const apps = ((data as any[]) || []);
      // Enriquece com o perfil de quem aceitou (N+1 — NÃO há FK pra embed PostgREST).
      // try/catch DEDICADO: se a query de profiles falhar, a lista de candidaturas
      // NÃO some (degrada pra "sem perfil"), preservando aprovar/recusar.
      try {
        const ids = [...new Set(apps.map((a) => a.influencer_user_id).filter(Boolean))];
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url, bio, city, state, niches, followers_count, website, instagram_username, tiktok_username, youtube_username, whatsapp, whatsapp_business, reach_estimate, avg_views, xp, level")
            .in("user_id", ids);
          const pmap = new Map(((profs as any[]) || []).map((p) => [p.user_id, p]));
          setApplications(apps.map((a) => ({ ...a, influencer: pmap.get(a.influencer_user_id) })) as unknown as CampaignApplication[]);
          return;
        }
      } catch (e) {
        console.error("enrich applications:", e); // degrada graciosamente
      }
      setApplications(apps as unknown as CampaignApplication[]);
    } catch {
      setApplications([]);
    }
  }, []);

  const fetchBrand = useCallback(async () => {
    setLoading(true);
    try {
      if (demo.isOn() || !user) {
        const b = readDemoBrand();
        setBrand(b);
        if (b) {
          const camps = demo.myCampaigns().filter((c) => c.brand_id === b.id);
          setCampaigns(camps);
          setApplications(demo.apps().filter((a) => camps.some((c) => c.id === a.campaign_id)));
        }
        return;
      }
      // Própria marca via RPC SECURITY DEFINER: as colunas sensíveis de brands
      // (código de convite, coordenada, plano, créditos) não são mais legíveis
      // direto pelo cliente — mas o DONO continua vendo a própria linha inteira.
      const { data } = await supabase.rpc("get_my_brand" as any).maybeSingle();
      const b = (data as Brand | null) ?? null;
      setBrand(b);
      if (b) {
        await fetchCampaigns(b.id);
      }
    } catch (e) {
      console.error("Error fetching brand:", e);
      setBrand(null);
    } finally {
      setLoading(false);
    }
  }, [user, fetchCampaigns]);

  // Sempre que mudam as campanhas, recarrega as candidaturas delas.
  useEffect(() => {
    if (brand) fetchApplications(campaigns.map((c) => c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  const createBrand = async (input: {
    name: string; slug: string; description?: string; logo_url?: string; website?: string;
  }): Promise<Brand | null> => {
    const cleanWebsite = normalizeBrandWebsiteDomain(input.website ?? "");
    const websiteValidation = validateBrandWebsiteDomain(cleanWebsite);
    if (!websiteValidation.isValid) {
      throw new Error(websiteValidation.error ?? "Website inválido");
    }

    // Demo: grava a marca no localStorage (demoUser não existe em auth.users).
    if (demo.isOn() || !user) {
      const b: Brand = {
        id: demoId("brand"),
        user_id: user?.id || "demo",
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        logo_url: input.logo_url ?? null,
        website: cleanWebsite || null,
        latitude: null,
        longitude: null,
        city: null,
        state: null,
        verified: false,
        status: "active",
        created_at: new Date().toISOString(),
      };
      writeDemoBrand(b);
      setBrand(b);
      return b;
    }
    try {
      const { data, error } = await supabase
        .rpc("create_my_brand" as never, {
          _name: input.name,
          _slug: input.slug,
          _description: input.description ?? null,
          _logo_url: input.logo_url ?? null,
          _website: cleanWebsite || null,
        } as never);
      if (error) throw error;
      const created = (Array.isArray(data) ? data[0] : data) as Brand;
      setBrand(created);
      return created;
    } catch (e) {
      console.error("createBrand:", e);
      throw e;
    }
  };

  // Cria um gig localizado. Já calcula total_budget (base + fee da plataforma).
  const createCampaign = async (input: CreateCampaignInput): Promise<Campaign | null> => {
    if (!brand) return null;
    const rtype = input.reward_type ?? "per_video";
    const isProcess = input.campaign_kind === "process";
    const usaSplit = await splitLive();
    const isPermuta = rtype === "permuta";
    const phases = input.phases ?? (isProcess ? PROCESS_PHASES_DEFAULT : undefined);
    // Process: paga por etapa (reward_amount não usado). Permuta: influencer recebe
    // o produto. Standard: reward por vídeo + 20% em cima.
    const reward = isProcess || isPermuta ? 0 : input.reward_amount;
    const { total } = isProcess
      ? computeProcessBudget(input.slots, phases as any)
      : isPermuta
        ? computePermutaBudget(input.slots)
        : computeBudget(input.slots, input.reward_amount);
    const base: Campaign = {
      id: demoId("camp"),
      brand_id: brand.id,
      name: input.name,
      description: input.description ?? null,
      briefing: input.briefing ?? null,
      reward_type: rtype,
      reward_amount: reward,
      slots: input.slots,
      slots_filled: 0,
      target_city: input.target_city ?? null,
      target_state: input.target_state ?? null,
      target_gender: input.target_gender,
      min_followers: input.min_followers,
      deadline_hours: input.deadline_hours,
      physical_item: input.physical_item ?? null,
      territory_scope: input.territory_scope ?? "cidade",
      territory_name: input.territory_name ?? null,
      territory_neighborhood: input.territory_neighborhood ?? null,
      territory_street: input.territory_street ?? null,
      platform_fee_pct: PLATFORM_FEE_PCT,
      total_budget: total,
      // No split a marca não paga adiantado — ela paga POR CREATOR aprovado.
      // Então a campanha já nasce visível (funded é o flag de visibilidade) e
      // sem dinheiro retido. No escrow segue como sempre: paga antes de ir ao ar.
      funded: usaSplit,
      pay_mode: usaSplit ? "split" : "escrow",
      auto_approve: input.auto_approve ?? false,
      auto_accept: input.auto_accept ?? false,
      campaign_kind: isProcess ? "process" : "standard",
      phases: (isProcess ? phases : {}) as any,
      status: "active",
    };

    if (demo.isOn() || !user) {
      demo.addCampaign(base);
      setCampaigns((prev) => [base, ...prev]);
      return base;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Faça login novamente para criar a campanha.");
      const response = await fetch("/api/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Não foi possível criar a campanha.");
      const created = data as Campaign;
      setCampaigns((prev) => [created, ...prev]);
      return created;
    } catch (e) {
      console.error("createCampaign:", e);
      return null; // erro real → o caller trata (não cria campanha fantasma local)
    }
  };

  // Marca a campanha como paga/ativa (chamado pelo CampaignPaymentStep).
  const markCampaignFunded = useCallback(async (campaignId: string) => {
    if (demo.isOn() || !user) {
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, funded: true } : c)));
      // Persiste no localStorage de campanhas demo.
      const all = demo.myCampaigns().map((c) => (c.id === campaignId ? { ...c, funded: true } : c));
      localStorage.setItem("onlyshop_demo_my_campaigns", JSON.stringify(all));
    }
  }, [user]);

  // Aprova uma entrega: split 80/20 vira créditos no ledger (demo).
  const approveApplication = useCallback(async (app: CampaignApplication, reward: number) => {
    if (demo.isOn() || !user) {
      demo.updateApp(app.id, { status: "approved" });
      const split = computeSplit(reward);
      const now = new Date().toISOString();
      // Payout integral do prêmio para o influencer.
      demo.addCredit({
        id: demoId("cr"),
        user_id: app.influencer_user_id,
        kind: "payout",
        amount: split.influencer,
        campaign_id: app.campaign_id,
        status: "completed",
        provider: null,
        provider_ref: null,
        created_at: now,
      });
      // Fee 20% pra plataforma.
      demo.addCredit({
        id: demoId("cr"),
        user_id: "platform",
        kind: "platform_fee",
        amount: split.platform,
        campaign_id: app.campaign_id,
        status: "completed",
        provider: null,
        provider_ref: null,
        created_at: now,
      });
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "approved" } : a)));
      return;
    }
    try {
      // Aprova + split 80/20 (server-side, service_role). Envia o JWT pra autorizar.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/approve-delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ applicationId: app.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "falha ao aprovar");
      }
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "approved" } : a)));
    } catch (e) {
      console.error("approveApplication:", e);
      throw e;
    }
  }, [user]);

  // Campanha paga nunca é cancelada no navegador: isso exige estorno contábil.
  const cancelCampaign = useCallback(async (campaignId: string): Promise<boolean> => {
    const camp = campaigns.find((c) => c.id === campaignId);
    if (demo.isOn() || !user) {
      const all = demo.myCampaigns().filter((c) => c.id !== campaignId);
      localStorage.setItem("onlyshop_demo_my_campaigns", JSON.stringify(all));
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      return true;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Faça login novamente.");
      const response = await fetch("/api/cancel-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ campaignId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "não foi possível cancelar");
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      return true;
    } catch (e) {
      console.error("cancelCampaign:", e);
      return false;
    }
  }, [user, campaigns]);

  // A marca aprova o PERFIL do candidato (vira contratação). No modelo "Ganhe no
  // Processo", é a aprovação que libera a CONEXÃO (R$20) — não o aceite do influencer.
  const approveApplicant = useCallback(async (app: CampaignApplication): Promise<boolean> => {
    if (demo.isOn() || !user) {
      demo.updateApp(app.id, { status: "accepted" });
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "accepted" } : a)));
      return true;
    }
    try {
      const { error } = await supabase.from("campaign_applications" as any)
        .update({ status: "accepted", updated_at: new Date().toISOString() } as any).eq("id", app.id);
      if (error) throw error;
      try {
        const camp = campaigns.find((c) => c.id === app.campaign_id);
        if (camp?.campaign_kind === "process") {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch("/api/payout-process", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
            body: JSON.stringify({ applicationId: app.id, phase: "connection" }),
          });
        }
      } catch { /* conexão best-effort — não desfaz a aprovação */ }
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "accepted" } : a)));
      return true;
    } catch (e) {
      console.error("approveApplicant:", e);
      return false;
    }
  }, [user, campaigns]);

  const rejectApplicant = useCallback(async (appId: string): Promise<boolean> => {
    if (demo.isOn() || !user) {
      demo.updateApp(appId, { status: "rejected" });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a)));
      return true;
    }
    try {
      await supabase.from("campaign_applications" as any)
        .update({ status: "rejected", updated_at: new Date().toISOString() } as any).eq("id", appId);
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a)));
      return true;
    } catch (e) {
      console.error("rejectApplicant:", e);
      return false;
    }
  }, [user]);

  // Recusar uma ENTREGA (status delivered → rejected). Persiste de verdade (antes
  // era só estado local que revertia no refresh).
  const rejectDelivery = useCallback(async (appId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from("campaign_applications" as any)
        .update({ status: "rejected", updated_at: new Date().toISOString() } as any).eq("id", appId);
      if (error) throw error;
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a)));
      return true;
    } catch (e) { console.error("rejectDelivery:", e); return false; }
  }, [user]);

  useEffect(() => { fetchBrand(); }, [fetchBrand]);

  return {
    brand, campaigns, applications, loading,
    createBrand, createCampaign, markCampaignFunded, approveApplication, cancelCampaign,
    approveApplicant, rejectApplicant, rejectDelivery,
    refetch: fetchBrand,
  };
}

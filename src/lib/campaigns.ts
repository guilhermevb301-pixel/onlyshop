// =============================================================================
// Núcleo do MVP "Conecta localizado" — tipos + dados demo + ledger (split 20/80).
//
// Real: tabelas campaigns / campaign_applications / platform_credits + RPC
// campaigns_near (migration 20260611200000). Demo: tudo em localStorage
// (mesmo padrão de lib/influencers.ts — o demoUser não existe em auth.users).
// =============================================================================
import { isDemoSession } from "@/lib/onboarding";

// ---- Contratos --------------------------------------------------------------
export type RewardType = "per_video" | "commission";
export type TargetGender = "any" | "female" | "male";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type ApplicationStatus =
  | "applied" | "accepted" | "delivered" | "approved" | "paid" | "rejected";
export type CreditKind =
  | "topup" | "campaign_hold" | "payout" | "platform_fee" | "refund" | "withdrawal";

export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  description?: string | null;
  reward_type: RewardType;
  reward_amount: number;
  slots: number;
  slots_filled: number;
  target_city?: string | null;
  target_state?: string | null;
  target_gender: TargetGender;
  min_followers: number;
  deadline_hours: number; // 24 | 48 | 168
  physical_item?: string | null;
  platform_fee_pct: number;
  total_budget: number;
  funded: boolean;
  status: CampaignStatus;
}

// Linha retornada por campaigns_near() — usada no mapa
export interface CampaignNear {
  campaign_id: string;
  brand_id: string;
  brand_name: string;
  title: string;
  reward_amount: number;
  reward_type: RewardType;
  slots: number;
  slots_filled: number;
  target_city: string | null;
  target_state: string | null;
  physical_item: string | null;
  deadline_hours: number;
  distance_km: number;
  brand_lat: number;
  brand_lon: number;
  category?: string | null;
}

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  influencer_user_id: string;
  status: ApplicationStatus;
  delivery_url?: string | null;
  distance_km?: number | null;
  created_at: string;
  updated_at: string;
  // enriquecido no front (demo): dados da campanha pra exibir na lista
  campaign?: Partial<CampaignNear>;
}

export interface PlatformCredit {
  id: string;
  user_id: string;
  kind: CreditKind;
  amount: number; // + entra / - sai
  campaign_id?: string | null;
  status: string;
  provider?: "pix" | "mercadopago" | "asaas" | "stripe" | null;
  provider_ref?: string | null;
  created_at: string;
}

export const PLATFORM_FEE_PCT = 20;

// Custo de uma campanha pro lojista: base + fee da plataforma.
export function computeBudget(slots: number, reward: number, feePct = PLATFORM_FEE_PCT) {
  const base = (slots || 0) * (reward || 0);
  const fee = base * (feePct / 100);
  return { base, fee, total: base + fee };
}

// Split de uma entrega aprovada. MODELO: o influencer recebe o valor CHEIO da
// campanha (100% dele) — a taxa da plataforma é cobrada EM CIMA, do lado da marca
// (ver computeBudget). O influencer nunca "perde" %; ele só vê o que ganha (Uber-style).
export function computeSplit(reward: number, feePct = PLATFORM_FEE_PCT) {
  const influencer = reward;                  // 100% pro influencer
  const platform = reward * (feePct / 100);   // taxa que a MARCA pagou em cima
  return { influencer, platform };
}

// ---- Geo helper (demo calcula distância sem o banco) ------------------------
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Centro padrão quando não temos a localização do usuário (Sorocaba/SP — caso real dos áudios).
const DEFAULT_CENTER = { lat: -23.5015, lon: -47.4526 };

// ---- Campanhas demo (perto do usuário) --------------------------------------
type DemoSeed = {
  title: string; brand: string; category: string; reward: number; slots: number;
  filled: number; item: string; dLat: number; dLon: number;
};
const DEMO_SEEDS: DemoSeed[] = [
  { title: "Vestidos da nova coleção", brand: "Boutique Bella", category: "Moda", reward: 50, slots: 20, filled: 6, item: "1 vestido à sua escolha", dLat: 0.012, dLon: 0.008 },
  { title: "Marmitas fit caseiras", brand: "Sabor Caseiro", category: "Alimentação", reward: 40, slots: 15, filled: 4, item: "Kit degustação", dLat: -0.018, dLon: 0.02 },
  { title: "Lançamento sérum facial", brand: "GlowLab Cosméticos", category: "Beleza", reward: 60, slots: 10, filled: 7, item: "Kit skincare completo", dLat: 0.05, dLon: -0.04 },
  { title: "Resenha de whey protein", brand: "FitPro Suplementos", category: "Fitness", reward: 45, slots: 25, filled: 9, item: "Pote de whey 900g", dLat: -0.09, dLon: 0.11 },
  { title: "Unboxing fone TWS", brand: "TechHype Store", category: "Tech", reward: 70, slots: 8, filled: 2, item: "1 fone TWS", dLat: 0.03, dLon: 0.045 },
  { title: "Petshop do bairro", brand: "Pet Amor", category: "Pet", reward: 35, slots: 12, filled: 5, item: "Kit petisco + brinquedo", dLat: -0.025, dLon: -0.015 },
];

export function demoCampaigns(userLat?: number | null, userLon?: number | null): CampaignNear[] {
  const cLat = userLat ?? DEFAULT_CENTER.lat;
  const cLon = userLon ?? DEFAULT_CENTER.lon;
  return DEMO_SEEDS.map((s, i) => {
    const blat = cLat + s.dLat;
    const blon = cLon + s.dLon;
    return {
      campaign_id: `demo-camp-${i + 1}`,
      brand_id: `demo-brand-${i + 1}`,
      brand_name: s.brand,
      title: s.title,
      reward_amount: s.reward,
      reward_type: "per_video" as RewardType,
      slots: s.slots,
      slots_filled: s.filled,
      target_city: null,
      target_state: null,
      physical_item: s.item,
      deadline_hours: 168,
      distance_km: Math.round(haversineKm(cLat, cLon, blat, blon) * 10) / 10,
      brand_lat: blat,
      brand_lon: blon,
      category: s.category,
    };
  }).sort((a, b) => a.distance_km - b.distance_km);
}

// ---- Ledger / candidaturas demo (localStorage) ------------------------------
const APPS_KEY = "onlyshop_demo_applications";
const CREDITS_KEY = "onlyshop_demo_credits";
const MY_CAMPAIGNS_KEY = "onlyshop_demo_my_campaigns";

function read<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function write<T>(key: string, v: T[]) { localStorage.setItem(key, JSON.stringify(v)); }

export const demo = {
  isOn: isDemoSession,
  // candidaturas do influencer
  apps(): CampaignApplication[] { return read<CampaignApplication>(APPS_KEY); },
  addApp(app: CampaignApplication) { write(APPS_KEY, [app, ...read<CampaignApplication>(APPS_KEY)]); },
  updateApp(id: string, patch: Partial<CampaignApplication>) {
    write(APPS_KEY, read<CampaignApplication>(APPS_KEY).map((a) => (a.id === id ? { ...a, ...patch } : a)));
  },
  // ledger de créditos (split)
  credits(uid?: string): PlatformCredit[] {
    const all = read<PlatformCredit>(CREDITS_KEY);
    return uid ? all.filter((c) => c.user_id === uid) : all;
  },
  addCredit(c: PlatformCredit) { write(CREDITS_KEY, [c, ...read<PlatformCredit>(CREDITS_KEY)]); },
  // Saldo de UM usuário (payout entra, withdrawal sai). Sem uid soma tudo (compat).
  balance(uid?: string): number {
    const all = read<PlatformCredit>(CREDITS_KEY);
    return (uid ? all.filter((c) => c.user_id === uid) : all).reduce((s, c) => s + (c.amount || 0), 0);
  },
  // campanhas criadas pelo lojista em demo
  myCampaigns(): Campaign[] { return read<Campaign>(MY_CAMPAIGNS_KEY); },
  addCampaign(c: Campaign) { write(MY_CAMPAIGNS_KEY, [c, ...read<Campaign>(MY_CAMPAIGNS_KEY)]); },
};

// id curto pra registros demo
export function demoId(prefix = "demo"): string {
  return `${prefix}-${Date.now()}-${Math.floor(performance.now() % 100000)}`;
}

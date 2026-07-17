// =============================================================================
// Núcleo do MVP "Conecta localizado" — tipos + dados demo + ledger (split 20/80).
//
// Real: tabelas campaigns / campaign_applications / platform_credits + RPC
// campaigns_near (migration 20260611200000). Demo: tudo em localStorage
// (mesmo padrão de lib/influencers.ts — o demoUser não existe em auth.users).
// =============================================================================
import { isDemoSession } from "@/lib/onboarding";

// ---- Contratos --------------------------------------------------------------
export type RewardType = "per_video" | "commission" | "permuta";
export type TerritoryScope = "rua" | "bairro" | "cidade" | "zona";
export type TargetGender = "any" | "female" | "male";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type ApplicationStatus =
  | "applied" | "accepted" | "delivered" | "approved" | "paid" | "rejected";
export type CreditKind =
  | "topup" | "campaign_hold" | "payout" | "platform_fee" | "refund" | "withdrawal";

// "Ganhe no Processo": a campanha paga o afiliado por ETAPA (conexão/vídeo/live),
// com a taxa da plataforma EMBUTIDA em cada fase (não os 20% em cima).
export type CampaignKind = "standard" | "process";
export interface ProcessPhases {
  connection: { brand: number; affiliate: number };
  video: { amount: number; max: number };
  live: { amount: number; max: number };
}

export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  description?: string | null;
  briefing?: string | null; // exigências estruturadas da campanha (o influencer vê antes de aceitar)
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
  auto_approve?: boolean; // aprova/paga automático ao postar (opt-in da marca)
  campaign_kind?: CampaignKind; // "process" = Ganhe no Processo (paga por etapa)
  phases?: ProcessPhases | Record<string, never>;
  status: CampaignStatus;
  // Domínio geográfico (feature mapa-dominio)
  territory_scope?: TerritoryScope;
  territory_name?: string | null;
  territory_neighborhood?: string | null;
  territory_street?: string | null;
}

// Dono de um território (rua/bairro/cidade/zona) — retornado por territories_near.
export interface Territory {
  id: string;
  scope: TerritoryScope;
  name: string;
  city: string | null;
  state: string | null;
  neighborhood?: string | null;
  score: number;
  latitude?: number | null;
  longitude?: number | null;
  owner_user_id?: string | null;
  owner_username?: string | null;
  owner_display_name?: string | null;
  owner_avatar_url?: string | null;
  owner_level?: number | null;
  distance_km?: number | null;
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
  campaign_kind?: CampaignKind;
  phases?: ProcessPhases | Record<string, never>;
}

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  influencer_user_id: string;
  status: ApplicationStatus;
  delivery_url?: string | null;
  // Entrega editável: vários links de comprovação + comentário do influencer.
  proofs?: { links?: string[]; comment?: string } | null;
  posted_at?: string | null;
  distance_km?: number | null;
  created_at: string;
  updated_at: string;
  // Progresso "Ganhe no Processo" (server-truth escrito pelos endpoints de etapa).
  connection_paid_at?: string | null;
  videos_paid?: number;
  lives_paid?: number;
  // enriquecido no front (demo): dados da campanha pra exibir na lista
  campaign?: Partial<CampaignNear>;
  // enriquecido no lado da MARCA (N+1): perfil de quem aceitou a campanha
  influencer?: {
    user_id: string;
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    niches?: string[] | null;
    followers_count?: number | null;
    website?: string | null;
    instagram_username?: string | null;
    tiktok_username?: string | null;
    youtube_username?: string | null;
    whatsapp?: string | null;
    whatsapp_business?: string | null;
    reach_estimate?: number | null;
    avg_views?: number | null;
    xp?: number | null;
    level?: number | null;
  };
}

// Influenciador ativo perto (áudio 3 do Biel: o mapa mostra quem está próximo).
// Vem da RPC influencers_near. Campos de vitrine — sem contato/split.
export interface InfluencerNear {
  user_id: string;
  referral_code: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  niches: string[] | null;
  followers_count: number | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
}

// Fase 2 "Meu time": um afiliado do time da marca, agregado a partir das
// candidaturas nas campanhas dela (derivado de campaign_applications).
export interface TeamMember {
  user_id: string;
  influencer?: CampaignApplication["influencer"];
  deliveries: number;   // entregas (delivered + approved + paid)
  approved: number;     // aprovadas (approved + paid)
  totalPaid: number;    // soma do reward das aprovadas — 100% vai pro influencer (NÃO expõe fee)
  avgRating: number | null;
  ratingCount: number;
  lastActivity: string | null;
  campaignsCount: number;
  sampleApplication: CampaignApplication; // pra abrir o InfluencerProfileSheet no clique
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

// Avaliação da marca -> influencer (fluxo guiado de 4 critérios). Tabela `ratings`.
export interface Rating {
  id: string;
  application_id: string;
  rater_user_id: string;
  rated_user_id: string;
  stars: number; // média arredondada dos 4 critérios (1..5)
  criteria?: { prazo?: number; qualidade?: number; briefing?: number; comunicacao?: number } | null;
  comment?: string | null;
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

// Valor MÍNIMO de uma campanha PAGA (por influencer/vídeo). Barra o "R$1".
export const MIN_REWARD = 10;
// PERMUTA: o influencer recebe o PRODUTO (sem dinheiro). A marca paga esta taxa
// por contratação (vaga) pra plataforma — só isso.
export const PERMUTA_FEE = 25;

// Custo de uma campanha de PERMUTA: só a taxa da plataforma × vagas.
export function computePermutaBudget(slots: number, fee = PERMUTA_FEE) {
  const total = (slots || 0) * fee;
  return { base: 0, fee: total, total };
}

// Formata distância de forma humana (antes mostrava "8.89658581079915 km").
export function fmtKm(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  const km = Number(n);
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── "Ganhe no Processo" ──────────────────────────────────────────────────────
// Padrão do modelo do Biel (por vaga): conexão marca R$25→afiliado R$20; vídeo
// R$2 × 10; live R$10 × 7. Marca investe R$134, afiliado recebe R$110 (fee embutido).
export const PROCESS_PHASES_DEFAULT: ProcessPhases = {
  connection: { brand: 25, affiliate: 20 },
  video: { amount: 2, max: 10 },
  live: { amount: 10, max: 7 },
};
// Custo TOTAL da marca por vaga (fee embutido) = brand da conexão + brand vídeos + brand lives.
export function processCostPerSlot(phases: ProcessPhases = PROCESS_PHASES_DEFAULT): number {
  const conn = phases.connection.brand;              // 25
  const vids = 25;                                    // marca paga 25 pela fase de vídeos
  const lives = phases.live.max * 12;                 // R$12/dia × 7 = 84
  return conn + vids + lives;                          // 134
}
export function computeProcessBudget(slots: number, phases: ProcessPhases = PROCESS_PHASES_DEFAULT) {
  const total = (slots || 0) * processCostPerSlot(phases);
  return { base: 0, fee: 0, total };
}
// Teto que o afiliado recebe por vaga (o CAP dos payouts): 20 + 20 + 70 = 110.
export function processAffiliateCap(phases: ProcessPhases = PROCESS_PHASES_DEFAULT): number {
  return phases.connection.affiliate + phases.video.amount * phases.video.max + phases.live.amount * phases.live.max;
}

// Chat temporário (estilo Uber): só fica aberto ENQUANTO a campanha está ativa —
// da candidatura até a entrega. Depois de aprovada/paga/recusada, fecha. Regra
// única compartilhada pelos dois lados (marca e influencer) pra não divergir.
export function isCampaignChatOpen(status?: string) {
  return status === "accepted" || status === "delivered";
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
const RATINGS_KEY = "onlyshop_demo_ratings";

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
  // avaliações demo (marca -> influencer)
  ratings(): Rating[] { return read<Rating>(RATINGS_KEY); },
  addRating(r: Rating) { write(RATINGS_KEY, [r, ...read<Rating>(RATINGS_KEY)]); },
};

// id curto pra registros demo
export function demoId(prefix = "demo"): string {
  return `${prefix}-${Date.now()}-${Math.floor(performance.now() % 100000)}`;
}

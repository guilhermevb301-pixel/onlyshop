import type { TeamMember } from "@/lib/campaigns";
import { teamStatus } from "@/lib/campaigns";

// =============================================================================
// Score do afiliado — pontuação 0–100 + tier + sugestão de ação.
//
// HONESTIDADE: não é um "modelo de IA" que julga qualidade de conteúdo (o app não
// tem esse dado). É um score DETERMINÍSTICO sobre métricas REAIS: quanto entrega,
// taxa de aprovação, avaliação, recência e variedade de campanhas. Mesmos números
// → mesmo score, explicável. O valor pro Biel (priorizar, reativar, premiar) está
// no ranking + na sugestão, não em fingir uma IA que não existe.
// =============================================================================

export type Tier = "top" | "growing" | "potential" | "attention" | "inactive";

export interface AffiliateScore {
  score: number;            // 0–100
  tier: Tier;
  label: string;
  cls: string;              // classes do badge
  suggestion: string;       // ação recomendada pra marca
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Recência: quão “vivo” está o relacionamento.
function recencyFactor(lastActivity: string | null, now: number): number {
  if (!lastActivity) return 0.1;
  const days = (now - Date.parse(lastActivity)) / 86_400_000;
  if (days < 7) return 1;
  if (days < 30) return 0.7;
  if (days < 60) return 0.4;
  return 0.15;
}

export function scoreMember(m: TeamMember, now = Date.now()): AffiliateScore {
  const status = teamStatus(m, now);

  // Componentes normalizados 0–1.
  const produtividade = clamp01(m.deliveries / 10);                       // 10+ entregas satura
  const confiab = m.deliveries > 0 ? clamp01(m.approved / m.deliveries) : 0; // taxa de aprovação
  const reputacao = m.avgRating != null ? clamp01(m.avgRating / 5) : 0.6;  // sem nota = neutro
  const recencia = recencyFactor(m.lastActivity, now);
  const variedade = clamp01(m.campaignsCount / 5);

  const score = Math.round(
    produtividade * 30 + confiab * 20 + reputacao * 20 + recencia * 20 + variedade * 10
  );

  // Tier: cruza o score com o momento do relacionamento.
  let tier: Tier;
  if (status === "inativo") tier = "inactive";
  else if (score >= 72) tier = "top";
  else if (status === "novo" && m.deliveries <= 1) tier = "potential";
  else if (m.avgRating != null && m.avgRating >= 4.5 && m.deliveries <= 2) tier = "potential";
  else if (score < 40) tier = "attention";
  else tier = "growing";

  return { score, tier, ...TIER_CFG[tier](m) };
}

const TIER_CFG: Record<Tier, (m: TeamMember) => { label: string; cls: string; suggestion: string }> = {
  top: () => ({
    label: "Top performer",
    cls: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/25",
    suggestion: "Seu melhor afiliado. Considere aumentar a comissão ou dar exclusividade pra segurar ele.",
  }),
  growing: () => ({
    label: "Em crescimento",
    cls: "bg-primary/12 text-primary ring-primary/25",
    suggestion: "Consistente e confiável. Ofereça campanhas maiores pra ele crescer com você.",
  }),
  potential: () => ({
    label: "Potencial alto",
    cls: "bg-accent/12 text-accent ring-accent/25",
    suggestion: "Começou bem, ainda pouco usado. Mande mais campanhas e veja até onde vai.",
  }),
  attention: () => ({
    label: "Precisa de atenção",
    cls: "bg-warning/12 text-warning ring-warning/25",
    suggestion: "O ritmo caiu. Fale com ele ou envie um briefing novo antes que esfrie de vez.",
  }),
  inactive: () => ({
    label: "Inativo",
    cls: "bg-white/[0.05] text-muted-foreground/60 ring-white/10",
    suggestion: "Parado há mais de 30 dias. Vale uma campanha de reativação — ou arquivar.",
  }),
};

export const TIER_ORDER: Tier[] = ["top", "growing", "potential", "attention", "inactive"];

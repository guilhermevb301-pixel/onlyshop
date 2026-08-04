// =============================================================================
// Planos do modelo "Gestão de Afiliados" (CRM SaaS) — o 3º modelo do Biel.
// A marca paga uma mensalidade proporcional ao tamanho da base que gerencia.
//
// ⚠️ PREÇOS SUGERIDOS — a definir (mercado + Conselho). Trocar aqui num lugar só.
// A ativação inicia um TRIAL (sem cobrança). A cobrança recorrente real (MP
// assinaturas) é um passo separado, que só entra depois dos preços fechados.
// =============================================================================
export interface Plan {
  tier: string;
  name: string;
  maxAffiliates: number;      // teto de afiliados geridos (Infinity = ilimitado)
  priceMonth: number;         // R$/mês sugerido (0 = grátis; -1 = sob consulta)
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { tier: "inicio",  name: "Início",     maxAffiliates: 25,       priceMonth: 0 },
  { tier: "starter", name: "Starter",    maxAffiliates: 100,      priceMonth: 97,  highlight: true },
  { tier: "pro",     name: "Pro",        maxAffiliates: 500,      priceMonth: 297 },
  { tier: "scale",   name: "Scale",      maxAffiliates: 1000,     priceMonth: 497 },
  { tier: "custom",  name: "Enterprise", maxAffiliates: Infinity, priceMonth: -1 },
];

export const planByTier = (tier: string | null | undefined): Plan | undefined =>
  PLANS.find((p) => p.tier === tier);

// Menor plano que comporta a base atual — a recomendação pro tamanho do time.
export function recommendedPlan(affiliateCount: number): Plan {
  return PLANS.find((p) => affiliateCount <= p.maxAffiliates) ?? PLANS[PLANS.length - 1];
}

export const planPriceLabel = (p: Plan): string =>
  p.priceMonth === 0 ? "Grátis" : p.priceMonth < 0 ? "Sob consulta" : `R$ ${p.priceMonth}/mês`;

import type { Brand } from "@/hooks/useBrand";
import type { Campaign } from "@/lib/campaigns";

// Passo do guia de primeiros passos. `done` vem do estado REAL do usuário —
// nada é marcado à toa. O guia some sozinho quando tudo está feito.
export interface SetupStep {
  key: string;
  title: string;
  desc: string;
  done: boolean;
  to: string;          // pra onde o CTA leva
  cta: string;
}

// ---- MARCA ----------------------------------------------------------------
export function brandSetupSteps(brand: Brand, campaigns: Campaign[], memberCount: number): SetupStep[] {
  const perfilOk = !!brand.name && (!!brand.logo_url || !!brand.description);
  return [
    {
      key: "perfil",
      title: "Complete o perfil da loja",
      desc: "Logo e uma descrição curta — é o que o creator vê antes de aceitar.",
      done: perfilOk,
      to: "/settings", cta: "Completar",
    },
    {
      key: "campanha",
      title: "Crie sua primeira campanha",
      desc: "Permuta, paga ou por etapa. É o que traz os creators pra dentro.",
      done: campaigns.length > 0,
      to: "/brands", cta: "Criar campanha",
    },
    {
      key: "time",
      title: "Monte seu time",
      desc: "Convide afiliados pelo seu link ou aprove quem se candidatar.",
      done: memberCount > 0,
      to: "/time", cta: "Convidar",
    },
    {
      key: "plano",
      title: "Ative seu plano de gestão",
      desc: "Gerencie toda a base num lugar só. Comece no teste, sem cobrança.",
      done: (brand.plan_status ?? "none") !== "none",
      to: "/time", cta: "Ver planos",
    },
  ];
}

// ---- CREATOR --------------------------------------------------------------
export function creatorSetupSteps(
  profile: { bio?: string | null; niches?: string[] | null; city?: string | null; mp_connected?: boolean | null } | null,
  applicationCount: number,
): SetupStep[] {
  const perfilOk = !!profile?.bio && !!profile?.city && !!(profile?.niches && profile.niches.length > 0);
  return [
    {
      key: "perfil",
      title: "Complete seu perfil",
      desc: "Bio, cidade e seus nichos — é o que faz a marca te escolher.",
      done: perfilOk,
      to: "/profile", cta: "Completar",
    },
    {
      key: "mp",
      title: "Conecte o Mercado Pago",
      desc: "Pra receber automático, direto na sua conta, quando a marca pagar.",
      done: profile?.mp_connected === true,
      to: "/wallet", cta: "Conectar",
    },
    {
      key: "campanha",
      title: "Entre na sua primeira campanha",
      desc: "Ache marcas perto de você no mapa e candidate-se.",
      done: applicationCount > 0,
      to: "/mapa", cta: "Ver o mapa",
    },
  ];
}

export const setupProgress = (steps: SetupStep[]) => ({
  done: steps.filter((s) => s.done).length,
  total: steps.length,
  pct: Math.round((steps.filter((s) => s.done).length / Math.max(1, steps.length)) * 100),
  allDone: steps.every((s) => s.done),
  next: steps.find((s) => !s.done) ?? null,
});

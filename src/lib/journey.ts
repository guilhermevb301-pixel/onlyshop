// Jornada de carreira do criador (áudios 2 e 3: "nova carreira", ritmo gamificado).
// Marcos persistidos em localStorage — sem backend novo. O Studio/Dialog marcam
// os passos conforme o usuário age; a página /jornada e a home leem daqui.

export type Milestone =
  | "influencer_created"
  | "video_generated"
  | "video_published"
  | "first_sale"
  | "first_live";

export const MILESTONES: { key: Milestone; label: string; desc: string; emoji: string }[] = [
  { key: "influencer_created", label: "Crie seu influencer", desc: "Sua persona de IA que apresenta os produtos.", emoji: "🧑‍🎤" },
  { key: "video_generated", label: "Gere seu 1º vídeo", desc: "Escolha um produto e tenha um vídeo de venda pronto.", emoji: "🎬" },
  { key: "video_published", label: "Publique no TikTok Shop", desc: "Baixe e poste — seu primeiro anúncio no ar.", emoji: "🚀" },
  { key: "first_sale", label: "Faça sua 1ª venda", desc: "O primeiro PIX. O jogo começa de verdade aqui.", emoji: "💰" },
  { key: "first_live", label: "Faça sua 1ª live", desc: "A habilidade que constrói carreira sólida.", emoji: "🎙️" },
];

const KEY = "onlyshop_journey";

export function getJourney(): Record<Milestone, boolean> {
  const empty = {
    influencer_created: false, video_generated: false, video_published: false,
    first_sale: false, first_live: false,
  };
  if (typeof window === "undefined") return empty;
  try {
    return { ...empty, ...(JSON.parse(localStorage.getItem(KEY) || "{}")) };
  } catch {
    return empty;
  }
}

export function markMilestone(m: Milestone) {
  if (typeof window === "undefined") return;
  const cur = getJourney();
  if (cur[m]) return;
  localStorage.setItem(KEY, JSON.stringify({ ...cur, [m]: true }));
}

// Ativação = gerou o primeiro vídeo. É o gatilho que desbloqueia a Comunidade
// (Conselho: comunidade é recompensa da utilidade, não a porta).
export function hasActivated(): boolean {
  return getJourney().video_generated;
}

// Próximo marco pendente (pro card "Sua jornada" na home).
export function nextMilestone() {
  const j = getJourney();
  return MILESTONES.find((m) => !j[m.key]) ?? null;
}

export function journeyProgress(): number {
  const j = getJourney();
  const done = MILESTONES.filter((m) => j[m.key]).length;
  return Math.round((done / MILESTONES.length) * 100);
}

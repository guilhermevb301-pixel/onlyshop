// Banco de influencers de IA do Estúdio.
// Cada persona tem um estilo fixo (descrição usada no prompt de vídeo) e uma foto.
// A foto agora é usada como ROSTO do vídeo (image-to-video do Seedance 2.0) —
// não é mais só um avatar decorativo. O usuário também sobe a própria foto (custom).

export type Persona = {
  id: string;
  name: string;
  niche: string;
  description: string; // vai pro prompt de geração — descreve aparência + vibe
  avatar: string;      // foto de referência (vira o rosto do vídeo)
  custom?: boolean;    // true = criada pelo usuário (veio do Supabase)
};

export const PERSONAS: Persona[] = [
  {
    id: "helena",
    name: "Helena",
    niche: "Lifestyle & Bem-estar",
    description:
      "Brazilian woman, early-20s, long wavy brown hair, warm genuine smile, cozy beige knit sweater, friendly approachable vibe, home setting with plants and bookshelf",
    avatar: "/influencers/helena.jpg",
  },
  {
    id: "mila",
    name: "Mila",
    niche: "Beleza & Skincare",
    description:
      "Brazilian woman, mid-20s, long wavy brown hair, warm friendly smile, casual chic style, speaks to camera with energy",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces",
  },
  {
    id: "rafa",
    name: "Rafa",
    niche: "Fitness & Suplementos",
    description:
      "Brazilian man, late-20s, athletic build, short dark hair, confident upbeat tone, gym/streetwear style",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces",
  },
  {
    id: "bia",
    name: "Bia",
    niche: "Moda & Acessórios",
    description:
      "Brazilian young woman, early-20s, trendy fashion-forward look, expressive, playful TikTok energy",
    avatar:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=faces",
  },
  {
    id: "leo",
    name: "Leo",
    niche: "Tech & Gadgets",
    description:
      "Brazilian man, 30s, smart-casual, glasses, calm trustworthy reviewer tone, clean modern background",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces",
  },
  {
    id: "dona-cleusa",
    name: "Dona Cleusa",
    niche: "Casa & Cozinha",
    description:
      "Brazilian woman, 50s, warm maternal vibe, friendly and relatable, kitchen/home setting, speaks naturally",
    avatar:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=faces",
  },
  {
    id: "duda",
    name: "Duda",
    niche: "Geral / Lifestyle",
    description:
      "Brazilian young woman, 20s, girl-next-door authentic look, casual home setting, conversational TikTok tone",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces",
  },
];

export const CUSTOM_PERSONA_ID = "custom";

// Resolve a foto da persona para uma URL ABSOLUTA (o fal.ai baixa server-side,
// então precisa ser acessível publicamente — caminhos relativos como
// "/influencers/helena.jpg" viram "https://dominio/influencers/helena.jpg").
export function resolvePersonaPhoto(avatar: string): string {
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (typeof window !== "undefined") return new URL(avatar, window.location.origin).href;
  return avatar;
}

// Converte um registro do Supabase (user_influencers) numa Persona do app.
export function influencerToPersona(row: {
  id: string;
  name: string;
  niche: string | null;
  description: string | null;
  photo_url: string;
}): Persona {
  return {
    id: row.id,
    name: row.name,
    niche: row.niche ?? "Personalizado",
    description: row.description ?? "",
    avatar: row.photo_url,
    custom: true,
  };
}

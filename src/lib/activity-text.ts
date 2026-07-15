import { Trophy, TrendingUp, Crown, UserPlus, Sparkles } from "lucide-react";
import type { ActivityEvent } from "@/hooks/useActivity";

// Texto + ícone de cada tipo de atividade. Compartilhado entre o feed
// (/comunidade) e o ticker do mapa — pra a copy não divergir.
export const ACTIVITY_ICON: Record<string, { icon: typeof Trophy; color: string }> = {
  campaign_done: { icon: Trophy, color: "text-accent" },
  xp_levelup: { icon: TrendingUp, color: "text-primary" },
  street_owner: { icon: Crown, color: "text-warning" },
  new_signup: { icon: UserPlus, color: "text-accent" },
};

export function activityIcon(type: string) {
  return ACTIVITY_ICON[type] || { icon: Sparkles, color: "text-muted-foreground" };
}

export function activityText(e: ActivityEvent): string {
  const who = e.actor?.display_name || (e.actor?.username ? `@${e.actor.username}` : "Alguém");
  const local = e.city ? ` em ${e.city}` : "";
  switch (e.type) {
    case "campaign_done": return `${who} fez uma campanha${local} 🎬`;
    case "xp_levelup": return `${who} subiu pra ${e.metadata?.to || "um novo nível"} 🚀`;
    case "street_owner": return `${who} virou dono de ${e.metadata?.name || "um território"} 👑`;
    case "new_signup": return `${who} entrou no OnlyShop 👋`;
    default: return `${who} fez algo novo`;
  }
}

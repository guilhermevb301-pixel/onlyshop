import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const POINT_VALUES: Record<string, number> = {
  post: 10,
  comment: 5,
  like: 2,
  lesson_complete: 20,
  help_member: 15,
  daily_login: 5,
  streak_bonus: 25,
  course_complete: 100,
  campaign_join: 10,
  // Ações de RENDA — o jogo de verdade é vender, não dar scroll (Conselho dos 4).
  video_generated: 30,
  video_published: 50,
  first_sale: 500,
  live_done: 200,
  campaign_approved: 80, // XP quando a marca APROVA a entrega (amarrado ao dinheiro real)
};

export const LEVELS = [
  { key: "bronze", label: "Bronze", minXp: 0, color: "from-amber-700 to-amber-600", textColor: "text-amber-700", ring: "ring-amber-700/30", bg: "bg-amber-700/10", emoji: "🥉" },
  { key: "prata", label: "Prata", minXp: 500, color: "from-slate-400 to-slate-300", textColor: "text-slate-400", ring: "ring-slate-400/30", bg: "bg-slate-400/10", emoji: "🥈" },
  { key: "ouro", label: "Ouro", minXp: 2000, color: "from-amber-500 to-yellow-400", textColor: "text-amber-500", ring: "ring-amber-500/30", bg: "bg-amber-500/10", emoji: "🥇" },
  { key: "diamante", label: "Diamante", minXp: 5000, color: "from-cyan-400 to-blue-400", textColor: "text-cyan-400", ring: "ring-cyan-400/30", bg: "bg-cyan-400/10", emoji: "💎" },
  { key: "elite", label: "Elite", minXp: 10000, color: "from-purple-500 to-pink-500", textColor: "text-purple-400", ring: "ring-purple-500/30", bg: "bg-purple-500/10", emoji: "👑" },
];

export function getLevelInfo(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      const current = LEVELS[i];
      const next = LEVELS[i + 1];
      const progress = next
        ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
        : 100;
      return { ...current, xp, progress: Math.min(progress, 100), nextLevel: next || null };
    }
  }
  return { ...LEVELS[0], xp, progress: 0, nextLevel: LEVELS[1] };
}

export function useGamification() {
  const { user } = useAuth();

  const addPoints = useCallback(
    async (action: string, metadata: Record<string, any> = {}) => {
      if (!user) return;
      const points = POINT_VALUES[action] || 0;
      if (points === 0) return;

      try {
        await supabase.rpc("add_gamification_points", {
          _user_id: user.id,
          _action: action,
          _points: points,
          _metadata: metadata,
        });
      } catch (err) {
        console.error("Gamification error:", err);
      }
    },
    [user]
  );

  return { addPoints, POINT_VALUES };
}

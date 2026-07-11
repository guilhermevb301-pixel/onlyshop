import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { demo, demoId, type Rating } from "@/lib/campaigns";

interface SubmitInput {
  applicationId: string;
  ratedUserId: string;
  criteria: { prazo: number; qualidade: number; briefing: number; comunicacao: number };
  comment?: string;
}

// Avaliações que a MARCA fez (rater = usuário atual). myRatingFor faz lookup em
// memória (busca todas uma vez) pra o botão virar "Avaliado". submitRating grava
// 1 linha em ratings com stars = média dos 4 critérios. 100% desacoplado do pagamento.
export function useRatings() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setRatings([]); setLoading(false); return; }
    if (demo.isOn()) { setRatings(demo.ratings().filter((r) => r.rater_user_id === user.id)); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase.from("ratings" as any).select("*").eq("rater_user_id", user.id);
      setRatings(((data as any[]) || []) as Rating[]);
    } catch (e) {
      console.error("useRatings:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const myRatingFor = useCallback(
    (applicationId: string): Rating | undefined => ratings.find((r) => r.application_id === applicationId),
    [ratings]
  );

  const submitRating = useCallback(async (input: SubmitInput): Promise<boolean> => {
    if (!user) return false;
    const { prazo, qualidade, briefing, comunicacao } = input.criteria;
    const stars = Math.min(5, Math.max(1, Math.round((prazo + qualidade + briefing + comunicacao) / 4)));
    const comment = input.comment?.trim() || null;

    if (demo.isOn()) {
      demo.addRating({
        id: demoId("rat"), application_id: input.applicationId, rater_user_id: user.id,
        rated_user_id: input.ratedUserId, stars, criteria: input.criteria, comment,
        created_at: new Date().toISOString(),
      });
      await refresh();
      return true;
    }
    try {
      const { error } = await supabase.from("ratings" as any).insert({
        application_id: input.applicationId,
        rater_user_id: user.id,
        rated_user_id: input.ratedUserId,
        stars,
        criteria: input.criteria,
        comment,
      } as any);
      if (error) {
        if ((error as any).code === "23505") { await refresh(); return true; } // já avaliou → no-op
        throw error;
      }
      await refresh();
      return true;
    } catch (e) {
      console.error("submitRating:", e);
      return false;
    }
  }, [user, refresh]);

  return { ratings, loading, myRatingFor, submitRating, refresh };
}

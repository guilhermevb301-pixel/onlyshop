import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// XP/nível do PRÓPRIO usuário logado. Fonte de verdade: user_levels.total_xp
// (a mesma que Ranking/PublicProfile já usam). SELECT público via RLS.
export function useMyLevel() {
  const { user } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setTotalXp(0); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase.from("user_levels" as any).select("total_xp").eq("user_id", user.id).maybeSingle();
      setTotalXp(Number((data as any)?.total_xp ?? 0));
    } catch (e) {
      console.error("useMyLevel:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { totalXp, loading, refresh };
}

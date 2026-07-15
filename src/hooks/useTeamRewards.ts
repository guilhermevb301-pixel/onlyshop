import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TeamReward, CreateRewardInput } from "@/lib/teamRewards";

// Recompensas do time — lado MARCA (CRUD). RLS "team_rewards: brand owner".
export function useTeamRewards(brandId: string | null) {
  const [rewards, setRewards] = useState<TeamReward[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!brandId) { setRewards([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("team_rewards" as any)
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });
      setRewards(((data as any[]) || []) as TeamReward[]);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (input: CreateRewardInput): Promise<boolean> => {
    if (!brandId) return false;
    try {
      const { data, error } = await supabase
        .from("team_rewards" as any)
        .insert({ brand_id: brandId, status: "active", ...input } as any)
        .select()
        .single();
      if (error) throw error;
      setRewards((prev) => [data as unknown as TeamReward, ...prev]);
      return true;
    } catch {
      return false;
    }
  };

  const setStatus = async (id: string, status: TeamReward["status"]) => {
    try {
      await supabase.from("team_rewards" as any).update({ status } as any).eq("id", id);
      setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch { /* ignora */ }
  };

  return { rewards, loading, refresh, create, setStatus };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TeamReward } from "@/lib/teamRewards";

// Recompensas ativas visíveis ao AFILIADO — a RLS "team_rewards: team affiliate
// read" já filtra pros times em que ele trabalhou/participa; aqui só lê e nomeia a marca.
export function useActiveTeamRewards() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<(TeamReward & { brand_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setRewards([]); setLoading(false); return; }
      try {
        const { data } = await supabase
          .from("team_rewards" as any)
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false });
        const rws = ((data as any[]) || []) as TeamReward[];
        const bids = [...new Set(rws.map((r) => r.brand_id))];
        const bmap = new Map<string, string>();
        if (bids.length) {
          const { data: brs } = await supabase.from("brands").select("id, name").in("id", bids);
          ((brs as any[]) || []).forEach((b) => bmap.set(b.id, b.name));
        }
        setRewards(rws.map((r) => ({ ...r, brand_name: bmap.get(r.brand_id) })));
      } catch {
        setRewards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { rewards, loading };
}

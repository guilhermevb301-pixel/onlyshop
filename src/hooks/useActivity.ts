import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityEvent {
  id: string;
  actor_user_id: string | null;
  type: string; // campaign_done | xp_levelup | street_owner | new_signup
  target_id: string | null;
  metadata: any;
  city: string | null;
  street: string | null;
  created_at: string;
  actor?: { username?: string | null; display_name?: string | null; avatar_url?: string | null };
}

// Mural de atividade (público). Fetch inicial + enrich N+1 do actor + realtime.
export function useActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const enrich = useCallback(async (rows: ActivityEvent[]): Promise<ActivityEvent[]> => {
    const ids = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))] as string[];
    if (!ids.length) return rows;
    try {
      const { data: profs } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids);
      const pmap = new Map(((profs as any[]) || []).map((p) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, actor: r.actor_user_id ? pmap.get(r.actor_user_id) : undefined }));
    } catch {
      return rows;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("activity_events" as any).select("*").order("created_at", { ascending: false }).limit(20);
      const rows = ((data as any[]) || []) as ActivityEvent[];
      setEvents(await enrich(rows));
    } catch (e) {
      console.error("useActivity:", e);
    } finally {
      setLoading(false);
    }
  }, [enrich]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: novos eventos entram no topo (cap em 40 pra não crescer memória).
  useEffect(() => {
    const ch = supabase
      .channel("activity-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, async (payload) => {
        const [enriched] = await enrich([payload.new as ActivityEvent]);
        setEvents((prev) => [enriched, ...prev].slice(0, 40));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enrich]);

  return { events, loading, refresh };
}

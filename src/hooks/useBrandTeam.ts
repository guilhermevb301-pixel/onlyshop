import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { demo, type Campaign, type TeamMember } from "@/lib/campaigns";

// Roster do time da marca — DERIVADO de campaign_applications das campanhas dela
// (RLS "app: brand owner" já garante só as suas). Agrega por influencer.
// N+1 (perfis + ratings) — NUNCA embed PostgREST (não há FK garantida).
export function useBrandTeam(brandId: string | null, campaigns: Campaign[]) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const campIds = campaigns.map((c) => c.id);
      const rewardMap = new Map(campaigns.map((c) => [c.id, Number(c.reward_amount || 0)]));

      let apps: any[] = [];
      if (demo.isOn()) {
        apps = demo.apps().filter((a) => campIds.includes(a.campaign_id));
      } else {
        if (!brandId || campIds.length === 0) { setMembers([]); setLoading(false); return; }
        const { data } = await supabase
          .from("campaign_applications" as any)
          .select("*")
          .in("campaign_id", campIds);
        apps = (data as any[]) || [];
      }

      const ids = [...new Set(apps.map((a) => a.influencer_user_id).filter(Boolean))];
      const pmap = new Map<string, any>();
      const rmap = new Map<string, { sum: number; count: number }>();
      if (!demo.isOn() && ids.length) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url, bio, city, state, niches, followers_count, website, instagram_username, tiktok_username, xp, level")
            .in("user_id", ids);
          ((profs as any[]) || []).forEach((p) => pmap.set(p.user_id, p));
        } catch { /* degrada pra "sem perfil" */ }
        try {
          const { data: rts } = await supabase.from("ratings" as any).select("stars, rated_user_id").in("rated_user_id", ids);
          ((rts as any[]) || []).forEach((r) => {
            const cur = rmap.get(r.rated_user_id) || { sum: 0, count: 0 };
            cur.sum += Number(r.stars || 0); cur.count += 1;
            rmap.set(r.rated_user_id, cur);
          });
        } catch { /* degrada sem avaliação */ }
      }

      // Agrega por influencer.
      const byUser = new Map<string, TeamMember>();
      const campsByUser = new Map<string, Set<string>>();
      for (const a of apps) {
        const uid = a.influencer_user_id;
        if (!uid) continue;
        const delivered = ["delivered", "approved", "paid"].includes(a.status);
        const approved = ["approved", "paid"].includes(a.status);
        const act = a.posted_at || a.updated_at || a.created_at || null;

        let m = byUser.get(uid);
        if (!m) {
          const rt = rmap.get(uid);
          m = {
            user_id: uid,
            influencer: pmap.get(uid) || a.influencer || undefined,
            deliveries: 0, approved: 0, totalPaid: 0,
            avgRating: rt && rt.count ? rt.sum / rt.count : null,
            ratingCount: rt?.count ?? 0,
            lastActivity: null, campaignsCount: 0,
            sampleApplication: { ...a, influencer: pmap.get(uid) || a.influencer },
          };
          byUser.set(uid, m);
        }
        if (delivered) m.deliveries += 1;
        if (approved) { m.approved += 1; m.totalPaid += rewardMap.get(a.campaign_id) || 0; }
        if (act && (!m.lastActivity || act > m.lastActivity)) m.lastActivity = act;

        const set = campsByUser.get(uid) || new Set<string>();
        set.add(a.campaign_id);
        campsByUser.set(uid, set);
      }
      byUser.forEach((m, uid) => { m.campaignsCount = campsByUser.get(uid)?.size ?? 0; });
      setMembers([...byUser.values()]);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, campaigns]);

  useEffect(() => { refresh(); }, [refresh]);
  return { members, loading, refresh };
}

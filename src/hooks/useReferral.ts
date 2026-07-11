import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { referralLink } from "@/lib/referral";

export interface NetworkMember {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  is_brand?: boolean;
}
export interface Earning {
  amount: number;
  kind: string;
  source_amount: number | null;
  created_at: string;
}

// Rede de indicação do usuário: link pra bio, quem ele trouxe, empresas na rede,
// e os ganhos (33% 1ª compra + 5% recorrente).
export function useReferral() {
  const { user, profile } = useAuth();
  const [network, setNetwork] = useState<NetworkMember[]>([]);
  const [companies, setCompanies] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [earningsList, setEarningsList] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  const code = profile?.referral_code || null;
  const link = referralLink(code);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // Minha rede direta (quem se cadastrou pelo meu link).
      const { data: net } = await supabase
        .from("profiles" as any)
        .select("user_id, display_name, username, avatar_url, city, created_at")
        .eq("referred_by", user.id)
        .order("created_at", { ascending: false });
      const members = ((net as any[]) || []) as NetworkMember[];

      // Quais da rede são empresas (têm loja cadastrada).
      const ids = members.map((m) => m.user_id);
      let brandOwners = new Set<string>();
      if (ids.length) {
        const { data: br } = await supabase.from("brands").select("user_id").in("user_id", ids);
        brandOwners = new Set(((br as any[]) || []).map((b) => b.user_id));
      }
      setNetwork(members.map((m) => ({ ...m, is_brand: brandOwners.has(m.user_id) })));
      setCompanies(brandOwners.size);

      // Meus ganhos de indicação.
      const { data: earn } = await supabase
        .from("referral_earnings" as any)
        .select("amount, kind, source_amount, created_at")
        .eq("earner_user_id", user.id)
        .order("created_at", { ascending: false });
      const arr = ((earn as any[]) || []) as Earning[];
      setEarningsList(arr);
      setEarnings(arr.reduce((s, e) => s + Number(e.amount || 0), 0));
    } catch (e) {
      console.error("useReferral:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { code, link, network, companies, earnings, earningsList, loading, refresh };
}

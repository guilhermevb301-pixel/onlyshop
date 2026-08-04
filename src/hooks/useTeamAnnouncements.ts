import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id: string;
  brand_id: string;
  brand_name?: string;
  title: string;
  body: string;
  created_at: string;
}

// Avisos do time (broadcast). A RLS já resolve a segurança:
//  - marca (dono): cria e lê os seus  ("ta: brand owner all")
//  - afiliado ativo: só LÊ os das marcas em que é membro ("ta: team member select")
//
// brandId presente = modo MARCA (lista da marca + create). Sem = modo AFILIADO
// (lista tudo que a RLS deixa ver, com o nome da marca).
export function useTeamAnnouncements(brandId?: string | null) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("team_announcements" as any).select("*").order("created_at", { ascending: false }).limit(50);
      if (brandId) query = query.eq("brand_id", brandId);
      const { data } = await query;
      const rows = (data as any[]) || [];

      // Modo afiliado: enriquece com o nome da marca (N+1, brands é SELECT público).
      if (!brandId && rows.length) {
        const ids = [...new Set(rows.map((r) => r.brand_id))];
        try {
          const { data: brands } = await supabase.from("brands").select("id, name").in("id", ids);
          const bmap = new Map(((brands as any[]) || []).map((b) => [b.id, b.name]));
          rows.forEach((r) => { r.brand_name = bmap.get(r.brand_id); });
        } catch { /* segue sem o nome */ }
      }
      setItems(rows as Announcement[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const create = async (title: string, body: string): Promise<boolean> => {
    if (!brandId) return false;
    const t = title.trim(), b = body.trim();
    if (!t && !b) return false;
    try {
      const { error } = await supabase.from("team_announcements" as any).insert({ brand_id: brandId, title: t || "Aviso", body: b });
      if (error) return false;
      await load();
      return true;
    } catch {
      return false;
    }
  };

  return { items, loading, create, refresh: load };
}

import { supabase } from "@/integrations/supabase/client";

// Upsert das etiquetas + nota interna de um afiliado (privado da marca).
// A RLS "meta: brand owner all" garante que só o dono da marca grava.
export async function saveAffiliateMeta(
  brandId: string,
  affiliateUserId: string,
  patch: { tags?: string[]; notes?: string | null; stage?: string | null }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("brand_affiliate_meta" as any)
      .upsert(
        {
          brand_id: brandId,
          affiliate_user_id: affiliateUserId,
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "brand_id,affiliate_user_id" }
      );
    return !error;
  } catch {
    return false;
  }
}

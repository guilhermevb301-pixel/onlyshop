// =============================================================================
// Motor de indicação (rede) — MVP 2.0.
// Cada pessoa tem um referral_code (gerado no banco). O link dela (pra bio) é
// onlyshopbrasil.com.br/i/CODIGO. Quem se cadastra por esse link entra na REDE
// dela (profiles.referred_by). O indicador ganha 33% na 1ª compra + 5% recorrente.
// =============================================================================
import { supabase } from "@/integrations/supabase/client";

const REF_KEY = "onlyshop_ref"; // código guardado no navegador até o cadastro

export function setStoredRef(code: string) {
  try { if (code) localStorage.setItem(REF_KEY, code.toUpperCase()); } catch { /* ignora */ }
}
export function getStoredRef(): string | null {
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}
export function clearStoredRef() {
  try { localStorage.removeItem(REF_KEY); } catch { /* ignora */ }
}

// Link de indicação (pra pessoa colocar na bio).
export function referralLink(code?: string | null): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://onlyshopbrasil.com.br";
  return code ? `${base}/i/${code}` : base;
}

// Dono de um código -> user_id (pra atribuir a rede no cadastro).
export async function resolveReferrer(code: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("profiles").select("user_id").eq("referral_code", code.toUpperCase()).maybeSingle();
    return (data as any)?.user_id ?? null;
  } catch { return null; }
}

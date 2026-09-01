// Conexão com o TikTok (OAuth Login Kit) — fala com a edge function tiktok-auth
// O token fica exclusivamente no servidor; o browser recebe apenas metadados.
import { supabase } from "@/integrations/supabase/client";

// Tem que bater EXATAMENTE com a Redirect URI registrada no app do TikTok.
export const TIKTOK_REDIRECT_URI = `${window.location.origin}/tiktok/callback`;
const STATE_KEY = "onlyshop_tiktok_state";

export type TikTokConnection = {
  tiktok_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
};

export async function getTikTokConnection(userId: string): Promise<TikTokConnection | null> {
  if (!userId) return null;
  const { data, error } = await supabase.rpc("get_my_tiktok_connection" as never);
  if (error) throw error;
  return ((Array.isArray(data) ? data[0] : data) as TikTokConnection) || null;
}

// 1) Inicia o OAuth: pega a URL de autorização do TikTok e redireciona pra lá.
export async function startTikTokConnect(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("tiktok-auth", {
    body: { action: "get_auth_url", redirect_uri: TIKTOK_REDIRECT_URI },
  });
  if (error || !data?.auth_url) {
    throw new Error(data?.error || error?.message || "Não consegui iniciar a conexão com o TikTok.");
  }
  localStorage.setItem(STATE_KEY, data.state || "");
  window.location.href = data.auth_url;
}

// 2) No /tiktok/callback: troca o code por token e salva a conexão.
export async function finishTikTokConnect(code: string, state: string, userId: string): Promise<TikTokConnection> {
  if (!userId) throw new Error("Sessão inválida.");
  const expected = localStorage.getItem(STATE_KEY);
  if (expected && state && expected !== state) {
    throw new Error("Verificação de segurança falhou (CSRF). Tenta conectar de novo.");
  }
  const { data, error } = await supabase.functions.invoke("tiktok-auth", {
    body: { action: "exchange_token", code, redirect_uri: TIKTOK_REDIRECT_URI },
  });
  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "Falha ao conectar com o TikTok.");
  }
  localStorage.removeItem(STATE_KEY);
  return data.user as TikTokConnection;
}

export async function disconnectTikTok(userId: string): Promise<void> {
  await supabase.from("tiktok_connections").delete().eq("user_id", userId);
}

// Posta um vídeo (MP4 público) no TikTok do usuário conectado.
export async function postToTikTok(videoUrl: string, caption: string) {
  const { data, error } = await supabase.functions.invoke("tiktok-post", {
    body: { action: "publish_video", video_url: videoUrl, caption },
  });
  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "Falha ao postar no TikTok.");
  }
  return data; // { publish_id }
}

// Conexão com o TikTok (OAuth Login Kit) — fala com a edge function tiktok-auth
// e guarda o token de cada usuário em tiktok_connections.
import { supabase } from "@/integrations/supabase/client";

// Tem que bater EXATAMENTE com a Redirect URI registrada no app do TikTok.
export const TIKTOK_REDIRECT_URI = "https://onlyshoptok.vercel.app/tiktok/callback";
const STATE_KEY = "onlyshop_tiktok_state";

export type TikTokConnection = {
  tiktok_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  access_token: string | null;
};

export async function getTikTokConnection(userId: string): Promise<TikTokConnection | null> {
  const { data } = await supabase
    .from("tiktok_connections")
    .select("tiktok_username, display_name, avatar_url, followers_count, access_token")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as TikTokConnection) || null;
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
  const t = data.tokens, u = data.user;
  const expiresAt = new Date(Date.now() + (t.expires_in ?? 0) * 1000).toISOString();
  await supabase.from("tiktok_connections").upsert(
    {
      user_id: userId,
      tiktok_user_id: u.tiktok_user_id,
      tiktok_username: u.tiktok_username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      token_expires_at: expiresAt,
      scopes: (t.scope || "").split(",").filter(Boolean),
      followers_count: u.followers_count ?? 0,
      following_count: u.following_count ?? 0,
      likes_count: u.likes_count ?? 0,
      video_count: u.video_count ?? 0,
      is_verified: !!u.is_verified,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  localStorage.removeItem(STATE_KEY);
  return u as TikTokConnection;
}

export async function disconnectTikTok(userId: string): Promise<void> {
  await supabase.from("tiktok_connections").delete().eq("user_id", userId);
}

// Posta um vídeo (MP4 público) no TikTok do usuário conectado.
export async function postToTikTok(accessToken: string, videoUrl: string, caption: string) {
  const { data, error } = await supabase.functions.invoke("tiktok-post", {
    body: { action: "publish_video", access_token: accessToken, video_url: videoUrl, caption },
  });
  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "Falha ao postar no TikTok.");
  }
  return data; // { publish_id }
}

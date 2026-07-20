// Multi-conta (pedido do Biel): a mesma pessoa tem conta PJ (marca) e PF (influencer)
// e alterna entre elas sem deslogar/logar — igual Instagram.
//
// Guarda no localStorage o mínimo pra retomar a sessão de cada conta (os mesmos
// tokens que o Supabase JÁ guarda pra sessão ativa — não é segredo novo). Se a
// troca falhar (token expirado), o caller manda pro /auth: nunca trava o usuário.

export interface SavedAccount {
  user_id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  access_token: string;
  refresh_token: string;
  saved_at: number;
}

const KEY = "onlyshop_accounts";
const MAX = 5;

export function getAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

// Salva/atualiza a conta atual na lista (LRU, cap 5).
export function saveAccount(acc: Omit<SavedAccount, "saved_at">): void {
  try {
    if (!acc.user_id || !acc.access_token || !acc.refresh_token) return;
    const rest = getAccounts().filter((a) => a.user_id !== acc.user_id);
    const next = [{ ...acc, saved_at: Date.now() }, ...rest].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* localStorage indisponível */ }
}

export function removeAccount(userId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getAccounts().filter((a) => a.user_id !== userId)));
  } catch { /* ignora */ }
}

// Atualiza os tokens da conta salva (o Supabase renova o refresh token ao longo da sessão).
export function refreshSavedTokens(userId: string, access_token: string, refresh_token: string): void {
  try {
    const list = getAccounts();
    const i = list.findIndex((a) => a.user_id === userId);
    if (i < 0) return;
    list[i] = { ...list[i], access_token, refresh_token, saved_at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignora */ }
}

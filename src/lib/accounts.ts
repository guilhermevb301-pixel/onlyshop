// Lista de contas conhecidas neste dispositivo. Guarda somente metadados de UI;
// trocar de conta sempre exige autenticação e nunca reutiliza refresh tokens.
export interface SavedAccount {
  user_id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  saved_at: number;
}

const KEY = "onlyshop_accounts";
const MAX = 5;

function sanitize(value: unknown): SavedAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    if (typeof raw.user_id !== "string" || typeof raw.email !== "string") return [];
    return [{
      user_id: raw.user_id,
      email: raw.email,
      name: typeof raw.name === "string" ? raw.name : null,
      avatar_url: typeof raw.avatar_url === "string" ? raw.avatar_url : null,
      role: typeof raw.role === "string" ? raw.role : null,
      saved_at: Number.isFinite(Number(raw.saved_at)) ? Number(raw.saved_at) : Date.now(),
    }];
  }).slice(0, MAX);
}

export function getAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const clean = sanitize(JSON.parse(raw));
    const serialized = JSON.stringify(clean);
    if (serialized !== raw) localStorage.setItem(KEY, serialized);
    return clean;
  } catch {
    localStorage.removeItem(KEY);
    return [];
  }
}

export function saveAccount(acc: Omit<SavedAccount, "saved_at">): void {
  try {
    if (!acc.user_id || !acc.email) return;
    const safe = {
      user_id: acc.user_id,
      email: acc.email,
      name: acc.name ?? null,
      avatar_url: acc.avatar_url ?? null,
      role: acc.role ?? null,
      saved_at: Date.now(),
    };
    const next = [safe, ...getAccounts().filter((item) => item.user_id !== safe.user_id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* localStorage indisponível */ }
}

export function removeAccount(userId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getAccounts().filter((account) => account.user_id !== userId)));
  } catch { /* localStorage indisponível */ }
}

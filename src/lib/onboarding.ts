// Camada de papel/onboarding — funciona em 2 modos (espelha lib/influencers.ts):
//   - Real: user_roles + profiles no Supabase.
//   - Demo (login de teste): localStorage (demoUser não existe em auth.users).

const DEMO_FLAG = "onlyshop_demo_session";
const DEMO_ROLE_KEY = "onlyshop_demo_role";
const ONBOARDED_KEY = "onlyshop_onboarded";

export type OnboardingRole = "affiliate" | "brand"; // affiliate = influencer, brand = loja

export function isDemoSession(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(DEMO_FLAG) === "1";
}

export function getDemoRole(): OnboardingRole | null {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem(DEMO_ROLE_KEY);
  return r === "brand" || r === "affiliate" ? r : null;
}

export function setDemoRole(role: OnboardingRole) {
  localStorage.setItem(DEMO_ROLE_KEY, role);
}

export function isOnboarded(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "1");
}

// Reseta o onboarding (útil pra re-demonstrar do zero).
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
  localStorage.removeItem(DEMO_ROLE_KEY);
}

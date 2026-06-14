import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  isOnboarded, markOnboarded, getDemoRole, isDemoSession, type OnboardingRole,
} from "@/lib/onboarding";

// Gate de 1º acesso: escolher papel (loja/influencer) + localização + perfil.
// Demo: localStorage. Real: user_roles + profiles (via useAuth.setRole).
export function useOnboarding() {
  const { userRole, profile, setRole } = useAuth();

  const role: OnboardingRole | null = useMemo(() => {
    if (isDemoSession()) return getDemoRole();
    const r = userRole?.role;
    return r === "brand" ? "brand" : r === "affiliate" || r === "agency" ? "affiliate" : null;
  }, [userRole]);

  // Precisa de onboarding se: ainda não escolheu papel, ou (real) sem cidade no perfil.
  const needsOnboarding = useMemo(() => {
    if (isDemoSession()) return !isOnboarded() || !getDemoRole();
    if (!role) return true;
    return !(profile as any)?.city;
  }, [role, profile]);

  const chooseRole = useCallback(async (r: OnboardingRole) => {
    await setRole(r);
  }, [setRole]);

  const complete = useCallback(() => {
    if (isDemoSession()) markOnboarded();
  }, []);

  return { role, needsOnboarding, chooseRole, complete };
}

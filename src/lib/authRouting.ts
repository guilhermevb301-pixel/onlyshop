export type PrivateRouteDecision = "loading" | "/auth" | "/onboarding" | "allow";

export function privateRouteDecision(input: {
  loading: boolean;
  hasUser: boolean;
  needsOnboarding: boolean;
  pathname?: string;
}): PrivateRouteDecision {
  if (input.loading) return "loading";
  const pathname = input.pathname || "";
  if (pathname === "/comunidade" || /^\/post\/[^/]+$/.test(pathname) || /^\/u\/[^/]+$/.test(pathname)) {
    return "allow";
  }
  if (!input.hasUser) return "/auth";
  if (input.needsOnboarding) return "/onboarding";
  return "allow";
}

import { beforeEach, describe, expect, it } from "vitest";
import { getAccounts, saveAccount } from "@/lib/accounts";
import { buildFundingRequest, buildWithdrawalRequest } from "@/lib/secureRequests";
import { privateRouteDecision } from "@/lib/authRouting";

describe("browser security contracts", () => {
  beforeEach(() => localStorage.clear());

  it("never persists access or refresh tokens in the account list", () => {
    saveAccount({
      user_id: "user-1",
      email: "gui@example.com",
      name: "Gui",
      role: "brand",
      access_token: "must-not-persist",
      refresh_token: "must-not-persist-either",
    } as never);

    expect(getAccounts()).toEqual([
      expect.objectContaining({ user_id: "user-1", email: "gui@example.com", name: "Gui", role: "brand" }),
    ]);
    expect(localStorage.getItem("onlyshop_accounts")).not.toContain("must-not-persist");
  });

  it("strips tokens left by an older release while reading stored accounts", () => {
    localStorage.setItem("onlyshop_accounts", JSON.stringify([{
      user_id: "user-1",
      email: "gui@example.com",
      role: "brand",
      access_token: "legacy-access",
      refresh_token: "legacy-refresh",
      saved_at: 1,
    }]));

    expect(getAccounts()[0]).not.toHaveProperty("access_token");
    expect(getAccounts()[0]).not.toHaveProperty("refresh_token");
    expect(localStorage.getItem("onlyshop_accounts")).not.toContain("legacy-access");
  });

  it("builds funding requests without caller-controlled amount or identity", () => {
    const request = buildFundingRequest("campaign-1", "jwt", "idem-1");

    expect(JSON.parse(String(request.body))).toEqual({ campaignId: "campaign-1" });
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt",
      "Idempotency-Key": "idem-1",
    });
  });

  it("uses an idempotency key for withdrawal requests", () => {
    const request = buildWithdrawalRequest({ amount: 60, pixKey: "pix@example.com", pixKeyType: "email" }, "jwt", "idem-2");

    expect(request.headers).toMatchObject({ Authorization: "Bearer jwt", "Idempotency-Key": "idem-2" });
  });

  it("redirects anonymous private routes and waits while auth loads", () => {
    expect(privateRouteDecision({ loading: true, hasUser: false, needsOnboarding: false, pathname: "/wallet" })).toBe("loading");
    expect(privateRouteDecision({ loading: false, hasUser: false, needsOnboarding: false, pathname: "/wallet" })).toBe("/auth");
    expect(privateRouteDecision({ loading: false, hasUser: true, needsOnboarding: true, pathname: "/wallet" })).toBe("/onboarding");
    expect(privateRouteDecision({ loading: false, hasUser: true, needsOnboarding: false, pathname: "/wallet" })).toBe("allow");
  });

  it("keeps only the intended content routes public", () => {
    for (const pathname of ["/comunidade", "/post/abc", "/u/gui"]) {
      expect(privateRouteDecision({ loading: false, hasUser: false, needsOnboarding: false, pathname })).toBe("allow");
    }
    expect(privateRouteDecision({ loading: false, hasUser: false, needsOnboarding: false, pathname: "/admin" })).toBe("/auth");
  });
});

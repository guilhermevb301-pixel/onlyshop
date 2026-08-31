import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockRes() {
  const state = { status: 200, body: undefined as unknown };
  return {
    state,
    res: {
      status(code: number) { state.status = code; return this; },
      json(body: unknown) { state.body = body; return this; },
    },
  };
}

const validReq = (body: Record<string, unknown> = {}) => ({
  method: "POST",
  headers: { authorization: "Bearer user-token", "idempotency-key": "f8b7d771-5b04-44f4-b8fe-69092ef16c52" },
  body,
  query: {},
});

describe("financial handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.MERCADOPAGO_ACCESS_TOKEN = "mp-token";
    process.env.APP_URL = "https://onlyshopbrasil.com.br";
    process.env.MP_SPLIT_LIVE = "false";
    delete process.env.MP_WEBHOOK_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WITHDRAWAL_ENCRYPTION_KEY;
  });

  it("create-campaign rejects an unauthenticated request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/create-campaign");
    const { res, state } = mockRes();

    await handler({ method: "POST", headers: {}, body: {} }, res);

    expect(state).toMatchObject({ status: 401, body: { error: "sem token" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create-campaign derives all financial fields instead of trusting the browser", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "user-1", email: "a@b.com" }));
      if (url.includes("/brands?")) return new Response(JSON.stringify([{ id: "brand-1" }]));
      if (url.endsWith("/campaigns")) {
        const payload = JSON.parse(String(init?.body));
        expect(payload).toMatchObject({
          brand_id: "brand-1",
          reward_amount: 100,
          slots: 3,
          platform_fee_pct: 20,
          total_budget: 360,
          funded: false,
          pay_mode: "escrow",
          campaign_kind: "standard",
        });
        expect(payload.total_budget).not.toBe(1);
        return new Response(JSON.stringify([{ id: "campaign-1", ...payload }]), { status: 201 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/create-campaign");
    const { res, state } = mockRes();

    await handler(validReq({
      name: "Campanha segura",
      reward_type: "per_video",
      reward_amount: 100,
      slots: 3,
      funded: true,
      total_budget: 1,
      platform_fee_pct: 0,
      pay_mode: "split",
    }), res);

    expect(state.status).toBe(201);
    expect(state.body).toMatchObject({ id: "campaign-1", total_budget: 360 });
  });

  it("fund-campaign ignores caller price and identity and uses the stored contract", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "brand-user", email: "brand@shop.com" }));
      if (url.includes("/campaigns?")) {
        return new Response(JSON.stringify([{
          id: "11111111-1111-4111-8111-111111111111",
          name: "Campanha",
          total_budget: 120,
          funded: false,
          pay_mode: "escrow",
          brands: { user_id: "brand-user" },
        }]));
      }
      if (url.includes("/campaign_fundings") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body));
        expect(payload).toMatchObject({ brand_user_id: "brand-user", expected_amount: 120 });
        return new Response(JSON.stringify([{ id: "22222222-2222-4222-8222-222222222222" }]), { status: 201 });
      }
      if (url.includes("api.mercadopago.com/checkout/preferences")) {
        const payload = JSON.parse(String(init?.body));
        expect(payload.items[0].unit_price).toBe(120);
        expect(payload.external_reference).toBe("funding:22222222-2222-4222-8222-222222222222");
        expect(payload.metadata).toEqual({ funding_id: "22222222-2222-4222-8222-222222222222" });
        return new Response(JSON.stringify({ id: "pref-1", init_point: "https://mp.test/checkout" }));
      }
      if (url.includes("/campaign_fundings?") && init?.method === "PATCH") return new Response(null, { status: 204 });
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/fund-campaign");
    const { res, state } = mockRes();

    await handler(validReq({
      campaignId: "11111111-1111-4111-8111-111111111111",
      amount: 0.01,
      brandUserId: "attacker-controlled",
    }), res);

    expect(state).toEqual({ status: 200, body: { configured: true, preference_id: "pref-1", init_point: "https://mp.test/checkout" } });
  });

  it("withdraw sends encrypted PIX data only to the atomic RPC", async () => {
    process.env.WITHDRAWAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "creator-1", email: "creator@test.com" }));
      if (url.endsWith("/rest/v1/rpc/request_withdrawal_atomic")) {
        const payload = JSON.parse(String(init?.body));
        expect(payload).toMatchObject({
          _user_id: "creator-1",
          _amount: 60,
          _pix_key_type: "email",
          _idempotency_key: "f8b7d771-5b04-44f4-b8fe-69092ef16c52",
        });
        expect(payload._pix_key_ciphertext).not.toContain("pix@example.com");
        return new Response(JSON.stringify({ result: "ok", request_id: "withdrawal-1" }));
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/withdraw");
    const { res, state } = mockRes();

    await handler(validReq({ amount: 60, pixKey: "pix@example.com", pixKeyType: "email" }), res);

    expect(state).toEqual({ status: 200, body: { ok: true, request_id: "withdrawal-1" } });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("platform_credits"))).toBe(false);
  });

  it("mp-webhook fails closed before any network call when its signing secret is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/mp-webhook");
    const { res, state } = mockRes();

    await handler({ method: "POST", headers: {}, query: { type: "payment", "data.id": "123" }, body: {} }, res);

    expect(state.status).toBe(503);
    expect(state.body).toEqual({ error: "Webhook Mercado Pago não configurado" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("approve-delivery delegates the money mutation to one atomic RPC", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "brand-user", email: "brand@test.com" }));
      if (url.endsWith("/rest/v1/rpc/approve_delivery_atomic")) {
        expect(JSON.parse(String(init?.body))).toEqual({ _application_id: "application-1", _caller_id: "brand-user" });
        return new Response(JSON.stringify({ result: "ok", influencer_share: 100 }));
      }
      if (url.includes("/rest/v1/rpc/add_gamification_points") || url.includes("/rest/v1/rpc/award_territory")) {
        return new Response(null, { status: 204 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/approve-delivery");
    const { res, state } = mockRes();

    await handler(validReq({ applicationId: "application-1" }), res);

    expect(state).toEqual({ status: 200, body: { ok: true, influencer_share: 100 } });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("platform_credits"))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("campaign_applications?"))).toBe(false);
  });

  it("payout-process delegates amount and caps to the database contract", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "creator-user", email: "creator@test.com" }));
      if (url.endsWith("/rest/v1/rpc/process_payout_atomic")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          _application_id: "application-1",
          _caller_id: "creator-user",
          _phase: "video",
          _index: 1,
        });
        return new Response(JSON.stringify({ result: "ok", amount: 2 }));
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/payout-process");
    const { res, state } = mockRes();

    await handler(validReq({ applicationId: "application-1", phase: "video", index: 1, amount: 9999 }), res);

    expect(state).toEqual({ status: 200, body: { ok: true, phase: "video", amount: 2 } });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("campaign_applications?"))).toBe(false);
  });

  it("refuses to cancel a funded campaign without an audited refund flow", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "brand-user" }));
      if (url.includes("/campaigns?")) {
        return new Response(JSON.stringify([{ id: "campaign-1", funded: true, brands: { user_id: "brand-user" } }]));
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: handler } = await import("../../../api/cancel-campaign");
    const { res, state } = mockRes();

    await handler(validReq({ campaignId: "campaign-1" }), res);

    expect(state.status).toBe(409);
    expect(fetchMock.mock.calls.some(([url], index) => index > 1 && String(url).includes("campaigns?"))).toBe(false);
  });
});

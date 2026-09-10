import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/[action]";
import { supabaseAdminRequest } from "../../api/_lib/supabase";
vi.mock("../../api/_lib/supabase", () => ({ supabaseAdminRequest: vi.fn() }));

const valid = { name: "Teste Lista", email: "teste@example.com", whatsapp: "15999991234", profile: "creator", consent: true };
async function request(body: unknown = valid, method = "POST") {
  const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  await handler({ method, body, query: { action: "waitlist" }, headers: { "x-vercel-forwarded-for": "192.0.2.1" } }, res);
  return res;
}
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-secret"); vi.mocked(supabaseAdminRequest).mockResolvedValue(true); });
describe("waitlist API", () => {
  it("rejects malformed JSON and invalid contacts before persistence", async () => {
    expect((await request("{")).status).toHaveBeenCalledWith(400);
    expect((await request({ ...valid, consent: false })).status).toHaveBeenCalledWith(400);
    expect(supabaseAdminRequest).not.toHaveBeenCalled();
  });
  it("normalizes and submits without storing a raw IP", async () => {
    expect((await request()).status).toHaveBeenCalledWith(200);
    const args = vi.mocked(supabaseAdminRequest).mock.calls[0];
    const body = JSON.parse(args[1]!.body as string);
    expect(body._whatsapp).toBe("5515999991234");
    expect(body._ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(body)).not.toContain("192.0.2.1");
  });
  it("ignores honeypot submissions", async () => {
    expect((await request({ ...valid, website: "spam" })).status).toHaveBeenCalledWith(200);
    expect(supabaseAdminRequest).not.toHaveBeenCalled();
  });
  it("surfaces rate limits and database failures without fake success", async () => {
    vi.mocked(supabaseAdminRequest).mockResolvedValueOnce(false);
    expect((await request()).status).toHaveBeenCalledWith(429);
    vi.mocked(supabaseAdminRequest).mockRejectedValueOnce(new Error("private error"));
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("private error");
  });
  it("rejects other methods", async () => { expect((await request(valid, "GET")).status).toHaveBeenCalledWith(405); });
  it("keeps campaign creation authenticated in the shared route", async () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await handler({ method: "POST", headers: {}, body: {}, query: { action: "create-campaign" } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(supabaseAdminRequest).not.toHaveBeenCalled();
  });
  it("returns 404 for unknown shared routes", async () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await handler({ query: { action: "unknown" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

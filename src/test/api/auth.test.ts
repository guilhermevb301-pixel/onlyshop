import { describe, expect, it, vi } from "vitest";
import { authenticateRequest, ApiError } from "../../../api/_lib/auth";

const env = {
  supabaseUrl: "https://project.supabase.co",
  serviceRoleKey: "service-role-test",
};

describe("authenticateRequest", () => {
  it("rejects a request without a bearer token before calling Supabase", async () => {
    const fetchImpl = vi.fn();

    await expect(authenticateRequest({ headers: {} }, { ...env, fetchImpl })).rejects.toMatchObject({
      status: 401,
      message: "sem token",
    } satisfies Partial<ApiError>);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an invalid token returned by Supabase", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "invalid" }), { status: 401 }));

    await expect(
      authenticateRequest({ headers: { authorization: "Bearer invalid" } }, { ...env, fetchImpl }),
    ).rejects.toMatchObject({ status: 401, message: "token inválido" } satisfies Partial<ApiError>);
  });

  it("returns only the authenticated identity for a valid token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "user-123", email: "gui@example.com", role: "authenticated" }), { status: 200 }),
    );

    await expect(
      authenticateRequest({ headers: { authorization: "bearer valid-token" } }, { ...env, fetchImpl }),
    ).resolves.toEqual({ id: "user-123", email: "gui@example.com" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: "service-role-test", Authorization: "Bearer valid-token" }),
      }),
    );
  });

  it("fails closed when the server Supabase configuration is absent", async () => {
    await expect(
      authenticateRequest({ headers: { authorization: "Bearer token" } }, { supabaseUrl: "", serviceRoleKey: "" }),
    ).rejects.toMatchObject({ status: 500, message: "Supabase não configurado" } satisfies Partial<ApiError>);
  });
});

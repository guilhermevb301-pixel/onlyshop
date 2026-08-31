import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("TikTok token isolation", () => {
  it("does not select or send TikTok access tokens from browser code", () => {
    const client = source("src/lib/tiktok.ts");
    const apiClient = source("src/lib/api/tiktok.ts");

    expect(client).not.toMatch(/select\([^)]*access_token/);
    expect(client).not.toMatch(/access_token\s*:/);
    expect(apiClient).not.toMatch(/access_token\s*:/);
  });

  it("requires JWT verification for every user TikTok edge function", () => {
    const config = source("supabase/config.toml");
    for (const name of ["tiktok-auth", "tiktok-metrics", "tiktok-post", "tiktok-shop"]) {
      expect(config).toContain(`[functions.${name}]\nverify_jwt = true`);
    }
  });

  it("never returns OAuth tokens from the auth function", () => {
    const authFunction = source("supabase/functions/tiktok-auth/index.ts");
    expect(authFunction).not.toMatch(/tokens:\s*\{/);
    expect(authFunction).toContain("saveTikTokConnection");
  });
});

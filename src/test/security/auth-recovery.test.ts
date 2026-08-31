import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("password recovery", () => {
  it("has a dedicated recovery route and clears credentials from the URL", () => {
    expect(source("src/App.tsx")).toContain('/auth/reset-password');
    const page = source("src/pages/ResetPassword.tsx");
    expect(page).toContain("PASSWORD_RECOVERY");
    expect(page).toContain("history.replaceState");
    expect(page).toContain("updateUser");
  });
});

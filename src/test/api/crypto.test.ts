import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSensitiveValue, encryptSensitiveValue } from "../../../api/_lib/crypto";

describe("sensitive value encryption", () => {
  it("round-trips a PIX key without exposing it in the stored payload", () => {
    const key = randomBytes(32).toString("base64");
    const encrypted = encryptSensitiveValue("gui@example.com", key);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("gui@example.com");
    expect(decryptSensitiveValue(encrypted, key)).toBe("gui@example.com");
  });

  it("rejects a key that is not exactly 32 bytes", () => {
    expect(() => encryptSensitiveValue("123", Buffer.from("short").toString("base64"))).toThrow(
      "WITHDRAWAL_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64",
    );
  });

  it("rejects ciphertext modified after encryption", () => {
    const key = randomBytes(32).toString("base64");
    const encrypted = encryptSensitiveValue("12345678900", key);
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;

    expect(() => decryptSensitiveValue(tampered, key)).toThrow();
  });
});

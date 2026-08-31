import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function decodeKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("WITHDRAWAL_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64");
  }
  return key;
}

export function encryptSensitiveValue(value: string, keyBase64: string): string {
  const key = decodeKey(keyBase64);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("hex")}.${tag.toString("hex")}.${ciphertext.toString("hex")}`;
}

export function decryptSensitiveValue(payload: string, keyBase64: string): string {
  const key = decodeKey(keyBase64);
  const [version, ivHex, tagHex, ciphertextHex] = payload.split(".");
  if (version !== "v1" || !ivHex || !tagHex || ciphertextHex == null) {
    throw new Error("payload cifrado inválido");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

import { describe, expect, it } from "vitest";
import * as urls from "@/lib/urlValidation";

describe("brand website domain handling", () => {
  it("stores only a clean domain when users type or paste a full URL", () => {
    expect(urls.normalizeBrandWebsiteDomain("https://www.empresa.com.br/produtos?utm=1")).toBe("empresa.com.br");
    expect(urls.normalizeBrandWebsiteDomain("http://empresa.com.br")).toBe("empresa.com.br");
    expect(urls.normalizeBrandWebsiteDomain("www.meusite.com")).toBe("meusite.com");
    expect(urls.normalizeBrandWebsiteDomain(" Empresa.COM.BR ")).toBe("empresa.com.br");
  });

  it("validates only real domains without protocol or www prefix", () => {
    expect(urls.validateBrandWebsiteDomain("empresa.com.br")).toEqual({ isValid: true });
    expect(urls.validateBrandWebsiteDomain("meusite.com")).toEqual({ isValid: true });
    expect(urls.validateBrandWebsiteDomain("https://empresa.com.br").isValid).toBe(false);
    expect(urls.validateBrandWebsiteDomain("www.empresa.com.br").isValid).toBe(false);
    expect(urls.validateBrandWebsiteDomain("localhost").isValid).toBe(false);
    expect(urls.validateBrandWebsiteDomain("empresa").isValid).toBe(false);
  });

  it("adds https only when the app needs to open the stored domain", () => {
    expect(urls.domainToHttpsUrl("empresa.com.br")).toBe("https://empresa.com.br/");
    expect(urls.domainToHttpsUrl("")).toBeNull();
    expect(urls.domainToHttpsUrl("http://empresa.com.br")).toBeNull();
  });
});

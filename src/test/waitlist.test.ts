import { describe, expect, it } from "vitest";
import { waitlistSchema, leadsCsv } from "../lib/waitlist";

const input = { name: "  Maria Silva  ", email: " MARIA@example.com ", whatsapp: "(15) 99999-1234", profile: "creator", consent: true };

describe("waitlist", () => {
  it("normalizes contact details", () => {
    expect(waitlistSchema.parse(input)).toMatchObject({ name: "Maria Silva", email: "maria@example.com", whatsapp: "5515999991234", profile: "creator" });
  });
  it("accepts a company and international Brazilian formatting", () => {
    expect(waitlistSchema.parse({ ...input, profile: "company", whatsapp: "+55 (11) 98888-7777" }).whatsapp).toBe("5511988887777");
  });
  it.each([{ email: "invalido" }, { whatsapp: "123" }, { whatsapp: "abc15999991234" }, { profile: "admin" }, { consent: false }, { name: " " }])("rejects invalid submission %j", (change) => {
    expect(waitlistSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });
  it("escapes CSV quotes and spreadsheet formulas", () => {
    const csv = leadsCsv([{ id: "1", position: 1, created_at: "2026-09-10T12:00:00Z", name: '=HYPERLINK("x")', email: "a@example.com", whatsapp: "5515999991234", profile: "creator" }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain("Creator");
  });
});

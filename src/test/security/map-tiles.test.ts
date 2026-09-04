import { describe, expect, it } from "vitest";
import { getCampaignMapTileConfig } from "@/lib/mapTiles";

describe("campaign map tile provider", () => {
  it("uses a public MapLibre style that does not require an API key", () => {
    const tile = getCampaignMapTileConfig();

    expect(tile.styleUrl).toBe("https://tiles.openfreemap.org/styles/dark");
    expect(tile.styleUrl).not.toMatch(/api[-_]?key|apikey|key=/i);
    expect(tile.styleUrl).not.toContain("basemaps.cartocdn.com");
    expect(tile.attribution).toContain("OpenStreetMap");
  });
});

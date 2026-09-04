export interface CampaignMapTileConfig {
  styleUrl: string;
  attribution: string;
}

export function getCampaignMapTileConfig(): CampaignMapTileConfig {
  return {
    styleUrl: "https://tiles.openfreemap.org/styles/dark",
    attribution: 'OpenFreeMap &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}

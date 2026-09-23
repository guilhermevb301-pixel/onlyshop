import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignNear } from "@/lib/campaigns";

// WebGL is unavailable in jsdom; keep our DOM markers and React lifecycle real.
const state = vi.hoisted(() => ({ flyTo: vi.fn(), fitBounds: vi.fn(), unsupported: false }));
vi.mock("maplibre-gl", () => ({
  setWorkerUrl() {},
  Map: class {
    constructor() { if (state.unsupported) throw new Error("WebGL2 unavailable"); }
    addControl() {} remove() {} resize() {} on() {} off() {}
    getZoom() { return 12; }
    flyTo = state.flyTo;
    fitBounds = state.fitBounds;
  },
  Marker: class {
    element: HTMLElement;
    constructor({ element }: { element: HTMLElement }) { this.element = element; }
    setLngLat() { return this; }
    addTo() { document.body.appendChild(this.element); return this; }
    remove() { this.element.remove(); }
  },
  NavigationControl: class {}, AttributionControl: class {},
  LngLatBounds: class { extend() { return this; } },
}));
import CampaignMap from "@/components/map/CampaignMap";

const campaign = {
  campaign_id: "c1", title: "Café da praça", reward_amount: 125.5,
  brand_lat: -23.51, brand_lon: -46.62,
} as CampaignNear;

describe("campaign map interactions", () => {
  beforeEach(() => { vi.clearAllMocks(); state.unsupported = false; });

  it("shows guidance instead of crashing when the browser cannot render WebGL", () => {
    state.unsupported = true;
    render(<CampaignMap userLat={-23.5} userLon={-46.6} campaigns={[]} onSelect={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(/lista/i);
  });

  it("lets users return to their chosen location after exploring", () => {
    render(<CampaignMap userLat={-23.5} userLon={-46.6} campaigns={[]} onSelect={() => {}} />);
    state.flyTo.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Voltar à minha localização" }));
    expect(state.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-46.6, -23.5] }));
  });

  it("opens the clicked campaign without resetting the viewport on a parent rerender", () => {
    const onSelect = vi.fn();
    const campaigns = [campaign];
    const { rerender } = render(<CampaignMap userLat={-23.5} userLon={-46.6} campaigns={campaigns} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Abrir campanha Café da praça/ }));
    expect(onSelect).toHaveBeenCalledWith(campaign);
    state.fitBounds.mockClear();
    rerender(<CampaignMap userLat={-23.5} userLon={-46.6} campaigns={campaigns} onSelect={() => {}} />);
    expect(state.fitBounds).not.toHaveBeenCalled();
  });
});

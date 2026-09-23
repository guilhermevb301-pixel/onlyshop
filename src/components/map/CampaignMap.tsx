import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { LngLatLike } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import "./campaign-map.css";
import type { CampaignNear } from "@/lib/campaigns";
import { getCampaignMapTileConfig } from "@/lib/mapTiles";

interface CampaignMapProps {
  userLat: number;
  userLon: number;
  campaigns: CampaignNear[];
  onSelect: (c: CampaignNear) => void;
}

function makeUserMarker() {
  const el = document.createElement("div");
  el.className = "os-user-marker";
  el.setAttribute("aria-label", "Sua localização de referência");
  return el;
}

function makeCampaignMarker(campaign: CampaignNear, onSelect: (c: CampaignNear) => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `Abrir campanha ${campaign.title}`);
  el.className = "os-campaign-marker";
  const label = document.createElement("span");
  label.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(campaign.reward_amount);
  el.appendChild(label);
  el.addEventListener("click", () => onSelect(campaign));
  return el;
}

export default function CampaignMap({ userLat, userLon, campaigns, onSelect }: CampaignMapProps) {
  const [unavailable, setUnavailable] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const initialCenterRef = useRef<[number, number]>([userLon, userLat]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tileConfig = getCampaignMapTileConfig();
    // MapLibre 6 ships a separate worker. Let Vite bundle its shared imports
    // instead of requesting a nonexistent worker next to the application chunk.
    maplibregl.setWorkerUrl(mapWorkerUrl);
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
      container: containerRef.current,
      style: tileConfig.styleUrl,
      center: initialCenterRef.current,
      zoom: 12,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      });
    } catch {
      setUnavailable(true);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: tileConfig.attribution }), "bottom-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [userLon, userLat], zoom: map.getZoom(), duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 600 });
  }, [userLat, userLon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [
      new maplibregl.Marker({ element: makeUserMarker() })
        .setLngLat([userLon, userLat])
        .addTo(map),
      ...campaigns.map((campaign) =>
        new maplibregl.Marker({ element: makeCampaignMarker(campaign, (c) => onSelectRef.current(c)), anchor: "bottom" })
          .setLngLat([campaign.brand_lon, campaign.brand_lat])
          .addTo(map)
      ),
    ];

    if (campaigns.length > 0) {
      const bounds = new maplibregl.LngLatBounds([userLon, userLat] as LngLatLike, [userLon, userLat] as LngLatLike);
      campaigns.forEach((campaign) => bounds.extend([campaign.brand_lon, campaign.brand_lat]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 600 });
    }
  }, [campaigns, userLat, userLon]);

  if (unavailable) return (
    <div role="status" className="flex h-full flex-col items-center justify-center gap-2 bg-[#e5e7e6] px-6 text-center text-black">
      <p className="font-semibold">O mapa não está disponível neste navegador.</p>
      <p className="max-w-sm text-sm text-[#525957]">Use a opção Lista para explorar as campanhas da sua região.</p>
    </div>
  );

  return (
    <div className="os-campaign-map relative h-full w-full bg-[#e5e7e6]">
      <div ref={containerRef} className="h-full w-full" aria-label="Mapa de campanhas perto de você" />
      <button type="button" aria-label="Voltar à minha localização" title="Voltar à minha localização"
        className="absolute right-3 top-24 z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
        onClick={() => mapRef.current?.flyTo({ center: [userLon, userLat], zoom: 14, duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 600 })}>
        <LocateFixed className="h-5 w-5" />
      </button>
    </div>
  );
}

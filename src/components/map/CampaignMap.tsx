import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import type { LngLatLike } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { CampaignNear } from "@/lib/campaigns";
import { getCampaignMapTileConfig } from "@/lib/mapTiles";

interface CampaignMapProps {
  userLat: number;
  userLon: number;
  campaigns: CampaignNear[];
  onSelect: (c: CampaignNear) => void;
}

function ensureMapStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("os-map-styles")) return;
  const style = document.createElement("style");
  style.id = "os-map-styles";
  style.textContent = `
    @keyframes os-ping{75%,100%{transform:scale(2.2);opacity:0}}
    .maplibregl-ctrl-attrib{background:rgb(0 0 0 / .55)!important;color:rgb(255 255 255 / .65)!important;font-size:10px!important;}
    .maplibregl-ctrl-attrib a{color:rgb(255 255 255 / .78)!important;}
    .maplibregl-ctrl button{background-color:rgb(0 0 0 / .72)!important;color:white!important;}
    .maplibregl-ctrl button + button{border-top-color:rgb(255 255 255 / .12)!important;}
  `;
  document.head.appendChild(style);
}

function makeUserMarker() {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:22px;height:22px;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:hsl(346 100% 58% / 0.35);animation:os-ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:9999px;background:hsl(346 100% 58%);box-shadow:0 0 14px hsl(346 100% 58%);border:2px solid #000;"></span>
    </div>`;
  return el;
}

function makeCampaignMarker(campaign: CampaignNear, onSelect: (c: CampaignNear) => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `Abrir campanha ${campaign.title}`);
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);padding:10px;margin:-10px;cursor:pointer;background:transparent;border:0;";
  el.innerHTML = `
    <div style="background:hsl(174 100% 47%);color:#022;font-weight:800;font-size:12.5px;line-height:1;padding:7px 11px;border-radius:9999px;white-space:nowrap;box-shadow:0 6px 18px hsl(174 100% 47% / 0.5);border:1.5px solid #000;letter-spacing:0;">R$${campaign.reward_amount}</div>
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid hsl(174 100% 47%);margin-top:-1px;"></div>`;
  el.addEventListener("click", () => onSelect(campaign));
  return el;
}

export default function CampaignMap({ userLat, userLon, campaigns, onSelect }: CampaignMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const initialCenterRef = useRef<[number, number]>([userLon, userLat]);

  useEffect(() => {
    ensureMapStyles();
    if (!containerRef.current || mapRef.current) return;

    const tileConfig = getCampaignMapTileConfig();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: tileConfig.styleUrl,
      center: initialCenterRef.current,
      zoom: 12,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
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
    map.flyTo({ center: [userLon, userLat], zoom: map.getZoom(), duration: 600 });
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
        new maplibregl.Marker({ element: makeCampaignMarker(campaign, onSelect), anchor: "bottom" })
          .setLngLat([campaign.brand_lon, campaign.brand_lat])
          .addTo(map)
      ),
    ];

    if (campaigns.length > 0) {
      const bounds = new maplibregl.LngLatBounds([userLon, userLat] as LngLatLike, [userLon, userLat] as LngLatLike);
      campaigns.forEach((campaign) => bounds.extend([campaign.brand_lon, campaign.brand_lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 600 });
    }
  }, [campaigns, onSelect, userLat, userLon]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-3xl bg-black"
      aria-label="Mapa de campanhas perto de você"
    />
  );
}

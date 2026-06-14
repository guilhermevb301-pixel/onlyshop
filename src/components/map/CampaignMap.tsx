import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import type { CampaignNear } from "@/lib/campaigns";

interface CampaignMapProps {
  userLat: number;
  userLon: number;
  campaigns: CampaignNear[];
  onSelect: (c: CampaignNear) => void;
}

// IMPORTANTE: o ícone padrão do Leaflet quebra no Vite (assets resolvidos por URL).
// Usamos divIcon (HTML puro) — funciona sempre e combina com o tema dark/magenta/cyan.

// Ponto pulsante do usuário (magenta = primary).
const userIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:22px;height:22px;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:hsl(346 100% 58% / 0.35);animation:os-ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:9999px;background:hsl(346 100% 58%);box-shadow:0 0 14px hsl(346 100% 58%);border:2px solid #000;"></span>
    </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Pino de campanha mostrando o valor "R$X" (accent = cyan = dinheiro).
function campaignIcon(reward: number) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px);">
        <div style="background:hsl(174 100% 47%);color:#022;font-weight:800;font-size:12px;line-height:1;padding:6px 9px;border-radius:9999px;white-space:nowrap;box-shadow:0 4px 14px hsl(174 100% 47% / 0.45);border:1.5px solid #000;">R$${reward}</div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid hsl(174 100% 47%);margin-top:-1px;"></div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Injeta os keyframes do ping uma única vez (divIcon usa HTML inline, sem CSS module).
function PingKeyframes() {
  return (
    <style>{`@keyframes os-ping{75%,100%{transform:scale(2.2);opacity:0}}`}</style>
  );
}

// Recentraliza o mapa quando a localização do usuário muda.
function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

export default function CampaignMap({ userLat, userLon, campaigns, onSelect }: CampaignMapProps) {
  return (
    <>
      <PingKeyframes />
      <MapContainer
        center={[userLat, userLon]}
        zoom={12}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: "100%", width: "100%", background: "#000" }}
        className="rounded-3xl"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Recenter lat={userLat} lon={userLon} />

        <Marker position={[userLat, userLon]} icon={userIcon} />

        {campaigns.map((c) => (
          <Marker
            key={c.campaign_id}
            position={[c.brand_lat, c.brand_lon]}
            icon={campaignIcon(c.reward_amount)}
            eventHandlers={{ click: () => onSelect(c) }}
          />
        ))}
      </MapContainer>
    </>
  );
}

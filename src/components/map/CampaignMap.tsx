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
// Hit-area generosa (padding maior + wrapper transparente) pra acertar fácil no celular (>=44px).
function campaignIcon(reward: number) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);padding:10px;margin:-10px;cursor:pointer;">
        <div style="background:hsl(174 100% 47%);color:#022;font-weight:800;font-size:12.5px;line-height:1;padding:7px 11px;border-radius:9999px;white-space:nowrap;box-shadow:0 6px 18px hsl(174 100% 47% / 0.5);border:1.5px solid #000;letter-spacing:-0.01em;">R$${reward}</div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid hsl(174 100% 47%);margin-top:-1px;"></div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Injeta os keyframes do ping UMA única vez no documento (divIcon usa HTML inline,
// sem CSS module). Guard por id evita nós <style> duplicados quando o mapa remonta.
function ensurePingKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("os-ping-keyframes")) return;
  const style = document.createElement("style");
  style.id = "os-ping-keyframes";
  style.textContent = `@keyframes os-ping{75%,100%{transform:scale(2.2);opacity:0}}`;
  document.head.appendChild(style);
}

// Recentraliza o mapa quando a localização do usuário muda (transição suave, sem salto).
function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], map.getZoom(), { duration: 0.6 });
  }, [lat, lon, map]);
  return null;
}

// No primeiro load enquadra usuário + todas as campanhas (fitBounds) pra nenhum
// pino ficar cortado. Reenquadra quando a lista de campanhas muda.
function FitToCampaigns({
  userLat,
  userLon,
  campaigns,
}: {
  userLat: number;
  userLon: number;
  campaigns: CampaignNear[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!campaigns.length) return;
    const points: [number, number][] = [
      [userLat, userLon],
      ...campaigns.map((c) => [c.brand_lat, c.brand_lon] as [number, number]),
    ];
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: true, duration: 0.6 });
    // intencional: roda no mount e quando a quantidade/identidade das campanhas muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length, userLat, userLon, map]);
  return null;
}

export default function CampaignMap({ userLat, userLon, campaigns, onSelect }: CampaignMapProps) {
  useEffect(() => {
    ensurePingKeyframes();
  }, []);

  return (
    <MapContainer
      center={[userLat, userLon]}
      zoom={12}
      scrollWheelZoom={false}
      zoomControl
      style={{ height: "100%", width: "100%", background: "#000" }}
      className="rounded-3xl"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Recenter lat={userLat} lon={userLon} />
      <FitToCampaigns userLat={userLat} userLon={userLon} campaigns={campaigns} />

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
  );
}

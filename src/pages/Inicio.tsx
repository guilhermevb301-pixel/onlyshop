import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCampaignsNear } from "@/hooks/useCampaignsNear";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import { SetupGuide } from "@/components/onboarding/SetupGuide";
import { creatorSetupSteps } from "@/lib/setupSteps";
import { TeamRewardsBanner } from "@/components/feed/TeamRewardsBanner";
import { AffiliateAnnouncementsFeed } from "@/components/feed/AffiliateAnnouncementsFeed";
import type { CampaignNear } from "@/lib/campaigns";
import {
  ArrowUpRight, MapPin, Wallet, Video, Sparkles, type LucideIcon,
} from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// Versão compacta pra chips/atalhos (sem centavos): "R$ 50".
const fmt0 = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

// Hue determinístico por marca → avatares diferentes mantendo a paleta OLED escura.
function brandHue(name?: string) {
  if (!name) return 320;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

type Atalho = { to: string; icon: LucideIcon; title: string; desc: string };

export default function Inicio() {
  const { user, profile, userRole } = useAuth();
  const { requestBrowserLocation } = useGeolocation();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Localização best-effort só pra contar campanhas perto (sem bloquear a home).
  useEffect(() => {
    let alive = true;
    requestBrowserLocation().then((geo) => {
      if (alive && geo) setCoords({ lat: geo.latitude, lon: geo.longitude });
    });
    return () => { alive = false; };
  }, [requestBrowserLocation]);

  // Só dados reais — a home pode ficar vazia (mostra empty state) até existir campanha real.
  const { campaigns, loading } = useCampaignsNear(coords?.lat, coords?.lon);
  const { balance, applications } = useCampaignApplications();

  const firstName = (profile?.display_name || user?.email?.split("@")[0] || "criador").split(" ")[0];
  // Só consideramos a contagem "real" quando a localização resolveu — evita flicker do número.
  const located = coords != null && !loading;
  const perto = campaigns.length;

  const atalhos: Atalho[] = [
    {
      to: "/mapa", icon: MapPin, title: "Perto de você",
      desc: located && perto > 0 ? `${perto} campanhas no seu raio` : "Marcas no seu mapa",
    },
    { to: "/affiliate", icon: Video, title: "Meus ganhos", desc: "Suas campanhas e entregas" },
    { to: "/wallet", icon: Wallet, title: "Carteira", desc: balance > 0 ? `Saldo ${fmt(balance)}` : "Saldo e saques PIX" },
  ];

  const showSkeleton = loading && campaigns.length === 0;

  return (
    <div className="space-y-12 lg:space-y-16">
      {/* ===== Guia de primeiros passos (creator) ===== */}
      {user && userRole?.role !== "brand" && (
        <div className="pt-2">
          <SetupGuide storageKey={`onlyshop_setup_creator_${user.id}`} steps={creatorSetupSteps(profile, applications.length)} />
        </div>
      )}

      {/* ===== Hero ===== */}
      <section className="pt-2 lg:pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="inline-flex items-center rounded-full border border-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {greeting()}, {firstName}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> OnlyShopper
          </span>
        </div>
        <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[0.98] max-w-3xl">
          Ache campanhas perto de você e <span className="text-gradient-primary">ganhe por vídeo</span>
        </h1>
        <p className="text-muted-foreground text-base lg:text-lg max-w-xl mt-5">
          Marcas e lojas da sua região querem creators. Pegue uma campanha, grave um vídeo simples e receba por entrega, sem precisar de seguidor nenhum.
        </p>
        <Link
          to="/mapa"
          className="group mt-7 inline-flex items-center gap-3 rounded-full pl-7 pr-2 py-3.5 bg-gradient-primary text-white font-semibold shadow-[var(--shadow-glow-cta)] transition-all duration-500 ease-[var(--ease-fluid)] active:scale-[0.98] hover:shadow-[0_12px_38px_-10px_hsl(346_100%_58%/0.6)]"
        >
          Ver campanhas perto de mim
          <span className="grid place-items-center h-9 w-9 rounded-full bg-black/20 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* ===== Atalhos ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <h2 className="text-base lg:text-lg font-semibold mb-5">Atalhos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          {atalhos.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              style={{ animationDelay: `${120 + i * 70}ms` }}
              className="group rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px shadow-[var(--shadow-bezel-inset)] hover:ring-primary/30 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 ease-[var(--ease-fluid)] animate-fade-in"
            >
              <div className="rounded-[1.4rem] bg-[#0c0c0e] p-4 lg:p-5 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-[0_6px_16px_-6px_hsl(346_100%_58%/0.5)]">
                    <a.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="grid place-items-center h-7 w-7 rounded-full bg-white/[0.06] transition-all duration-300 ease-[var(--ease-fluid)] group-hover:bg-white/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Avisos das marcas do time (CRM broadcast) ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <AffiliateAnnouncementsFeed />
      </section>

      {/* ===== Desafios dos times do afiliado (Fase 2) ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <TeamRewardsBanner />
      </section>

      {/* ===== Prova social — marcas perto querendo você ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <h2 className="text-base lg:text-lg font-semibold">Marcas perto querendo você</h2>
        </div>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {showSkeleton ? (
            // Loading caprichado: chips fantasma na mesma casca double-bezel.
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center gap-3 rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] px-4 py-3"
              >
                <div className="h-9 w-9 rounded-xl bg-white/[0.06] animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="h-2 w-16 rounded-full bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            ))
          ) : campaigns.length === 0 ? (
            <div className="w-full rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] px-5 py-6 text-center">
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Ainda não há marcas com campanha na sua região.<br />
                Assim que uma loja publicar perto de você, ela aparece aqui.
              </p>
            </div>
          ) : (
            <>
              {campaigns.slice(0, 8).map((c: CampaignNear) => {
                const hue = brandHue(c.brand_name);
                return (
                  <Link
                    key={c.campaign_id}
                    to="/mapa"
                    className="group shrink-0 flex items-center gap-3 rounded-[1.25rem] bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-3 shadow-[var(--shadow-bezel-inset)] hover:ring-primary/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-[var(--ease-fluid)]"
                  >
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/[0.06]"
                      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 22%), hsl(${(hue + 40) % 360} 60% 14%))` }}
                    >
                      <span className="text-xs font-bold text-white/90">{c.brand_name?.[0] ?? "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate max-w-[150px]">{c.brand_name}</p>
                      <p className="text-[11px] text-accent leading-tight flex items-center gap-1 tabular-nums">
                        <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                        {c.distance_km} km · {fmt0(c.reward_amount)}/vídeo
                      </p>
                    </div>
                  </Link>
                );
              })}
              <Link
                to="/mapa"
                className="group shrink-0 flex items-center gap-2 rounded-[1.25rem] bg-gradient-primary px-4 py-3 text-white font-semibold text-xs shadow-[var(--shadow-glow-cta)] active:scale-[0.98] transition-all duration-300 ease-[var(--ease-fluid)] hover:shadow-[0_12px_38px_-10px_hsl(346_100%_58%/0.6)]"
              >
                Ver todas
                <span className="grid place-items-center h-5 w-5 rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

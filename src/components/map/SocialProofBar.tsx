import { MapPin, BadgeDollarSign, Flame } from "lucide-react";
import { computeSplit, fmtKm } from "@/lib/campaigns";
import type { CampaignNear } from "@/lib/campaigns";
import { cn } from "@/lib/utils";

interface SocialProofBarProps {
  campaigns: CampaignNear[];
}

// R$ sem centavos, padrão único de dinheiro na barra.
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Barra de prova social no topo do mapa: quantas campanhas perto, quanto dá pra
// ganhar e a mais próxima. Gatilho de "tem dinheiro na mesa AGORA, perto de você".
export function SocialProofBar({ campaigns }: SocialProofBarProps) {
  const count = campaigns.length;
  // Pool LÍQUIDO do influencer (split 80/20) — mesma narrativa do sheet, sem isca bruto×líquido.
  const totalReward = campaigns.reduce((s, c) => s + computeSplit(c.reward_amount || 0).influencer, 0);
  const nearest = campaigns.reduce<CampaignNear | null>(
    (best, c) => (best == null || (c.distance_km ?? 999) < (best.distance_km ?? 999) ? c : best),
    null
  );
  const nearestNet = nearest ? computeSplit(nearest.reward_amount).influencer : 0;

  if (!count) return null;

  return (
    // double-bezel: casca com hairline + núcleo OLED interno
    <div className="rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px animate-fade-in">
      <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-4 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)]">
        {/* eyebrow AO VIVO */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 ring-1 ring-accent/20 px-2 py-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Ao vivo</span>
          </div>
          <p className="text-[11px] font-semibold text-foreground/90 tabular-nums">
            {count} campanha{count !== 1 ? "s" : ""} perto de você
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* gatilho de dinheiro em destaque (maior, cyan, extrabold) */}
          <Stat
            icon={<BadgeDollarSign className="h-4 w-4 text-accent" />}
            value={brl(totalReward)}
            label="na mesa hoje"
            highlight
          />
          <Stat
            icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />}
            value={nearest ? fmtKm(nearest.distance_km) : "—"}
            label="a mais perto"
          />
          <Stat
            icon={<Flame className="h-3.5 w-3.5 text-primary" />}
            value={brl(nearestNet)}
            label="por vídeo"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2.5 text-center transition-colors",
        highlight ? "bg-accent/[0.07] ring-1 ring-accent/20" : "bg-white/[0.02]"
      )}
    >
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span
          className={cn(
            "tabular-nums",
            highlight ? "text-base font-extrabold text-accent" : "text-sm font-bold text-foreground/90"
          )}
        >
          {value}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}

import { MapPin, BadgeDollarSign, Flame } from "lucide-react";
import type { CampaignNear } from "@/lib/campaigns";

interface SocialProofBarProps {
  campaigns: CampaignNear[];
}

// Barra de prova social no topo do mapa: quantas campanhas perto, quanto dá pra
// ganhar e a mais próxima. Gatilho de "tem dinheiro na mesa AGORA, perto de você".
export function SocialProofBar({ campaigns }: SocialProofBarProps) {
  const count = campaigns.length;
  // Soma do potencial: 1 vídeo por campanha disponível.
  const totalReward = campaigns.reduce((s, c) => s + (c.reward_amount || 0), 0);
  const nearest = campaigns.reduce<CampaignNear | null>(
    (best, c) => (best == null || (c.distance_km ?? 999) < (best.distance_km ?? 999) ? c : best),
    null
  );

  if (!count) return null;

  return (
    <div className="rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <p className="text-xs font-semibold">
          {count} campanha{count !== 1 ? "s" : ""} pagando perto de você agora
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={<BadgeDollarSign className="h-3.5 w-3.5 text-accent" />}
          value={`R$ ${totalReward}`}
          label="na mesa hoje"
        />
        <Stat
          icon={<MapPin className="h-3.5 w-3.5 text-accent" />}
          value={nearest ? `${nearest.distance_km} km` : "—"}
          label="a mais perto"
        />
        <Stat
          icon={<Flame className="h-3.5 w-3.5 text-primary" />}
          value={`R$ ${nearest?.reward_amount ?? 0}`}
          label="por vídeo"
        />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}

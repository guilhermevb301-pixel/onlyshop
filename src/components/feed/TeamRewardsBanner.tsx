import { useActiveTeamRewards } from "@/hooks/useActiveTeamRewards";
import { METRIC_LABEL } from "@/lib/teamRewards";
import { Trophy } from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Desafios ativos dos times do afiliado (aparece no /inicio dele). Só renderiza
// se houver recompensa — a RLS já filtra pros times em que ele participa.
export function TeamRewardsBanner() {
  const { rewards, loading } = useActiveTeamRewards();
  if (loading || rewards.length === 0) return null;
  return (
    <div className="space-y-2 animate-slide-up">
      <p className="text-sm font-semibold flex items-center gap-1.5"><Trophy className="h-4 w-4 text-warning" /> Desafios dos seus times</p>
      <div className="space-y-2">
        {rewards.slice(0, 3).map((r) => (
          <div key={r.id} className="rounded-2xl bg-gradient-to-b from-warning/[0.08] to-transparent p-px">
            <div className="rounded-[calc(1rem-1px)] bg-card/80 ring-1 ring-inset ring-warning/10 p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 ring-1 ring-warning/20 grid place-items-center shrink-0"><Trophy className="h-5 w-5 text-warning" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{r.title}</p>
                <p className="text-[11px] text-muted-foreground/60 truncate">
                  {r.brand_name ? `${r.brand_name} · ` : ""}{r.prize_amount > 0 ? `${brl(r.prize_amount)} · ` : ""}{METRIC_LABEL[r.metric]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

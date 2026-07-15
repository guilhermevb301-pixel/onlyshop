import { useActivity } from "@/hooks/useActivity";
import { activityIcon, activityText } from "@/lib/activity-text";
import { cn } from "@/lib/utils";

// "Acontecendo agora" no topo do mapa: atividade da região em tempo real
// (campanha feita, ganho, dono da rua, novo cadastro). Pedido do Biel — o mapa
// como feed vivo. Realtime via useActivity. Sem animação contínua (perf mobile).
export function MapActivityTicker() {
  const { events } = useActivity();
  const recent = events.slice(0, 3);
  if (recent.length === 0) return null;
  return (
    <div className="rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px">
      <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-accent/70 font-semibold flex items-center gap-1.5 mb-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_hsl(174_100%_47%/0.6)]" />
          Acontecendo agora
        </p>
        <div className="space-y-1.5">
          {recent.map((e) => {
            const cfg = activityIcon(e.type);
            const Icon = cfg.icon;
            return (
              <div key={e.id} className="flex items-center gap-2 text-[11px]">
                <Icon className={cn("h-3 w-3 shrink-0", cfg.color)} />
                <span className="text-white/75 truncate">{activityText(e)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import type { TeamMember } from "@/lib/campaigns";
import { PIPELINE_STAGES, teamStatus, type PipelineStage } from "@/lib/campaigns";
import { scoreMember } from "@/lib/affiliateScore";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GripVertical, Check } from "lucide-react";

// Etapa efetiva: a manual (brand_affiliate_meta.stage) ou, se não houver, uma
// derivada do momento do afiliado — pra o funil já nascer organizado.
function effectiveStage(m: TeamMember, now: number): PipelineStage {
  if (m.stage && (PIPELINE_STAGES as readonly string[]).includes(m.stage)) return m.stage as PipelineStage;
  const status = teamStatus(m, now);
  const tier = scoreMember(m, now).tier;
  if (status === "inativo") return "Inativo";
  if (tier === "top") return "Top afiliado";
  if (status === "novo" && m.deliveries === 0) return "Novo cadastro";
  if (m.approved > 0 || m.deliveries > 0) return "Ativo";
  return "Aprovado";
}

const COL_ACCENT: Record<PipelineStage, string> = {
  "Novo cadastro": "text-accent", "Em análise": "text-accent", "Aprovado": "text-primary",
  "Ativo": "text-emerald-400", "Top afiliado": "text-emerald-400", "Inativo": "text-muted-foreground/50",
};

export function TeamPipeline({ members, onMove, onSelect }: {
  members: TeamMember[];
  onMove: (userId: string, stage: PipelineStage) => void;
  onSelect: (m: TeamMember) => void;
}) {
  const now = Date.now();
  const [dragUser, setDragUser] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<PipelineStage, TeamMember[]>();
    PIPELINE_STAGES.forEach((s) => map.set(s, []));
    for (const m of members) map.get(effectiveStage(m, now))!.push(m);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 snap-x">
      {PIPELINE_STAGES.map((stage) => {
        const list = byStage.get(stage) || [];
        return (
          <div
            key={stage}
            onDragOver={(e) => { if (dragUser) e.preventDefault(); }}
            onDrop={() => { if (dragUser) { onMove(dragUser, stage); setDragUser(null); } }}
            className="shrink-0 w-[80vw] max-w-[17rem] snap-start rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.05] p-2.5"
          >
            <div className="flex items-center justify-between px-1.5 mb-2">
              <span className={`text-[11px] font-bold uppercase tracking-wide ${COL_ACCENT[stage]}`}>{stage}</span>
              <span className="text-[11px] text-muted-foreground/40 tabular-nums">{list.length}</span>
            </div>
            <div className="space-y-2 min-h-[3rem]">
              {list.map((m) => {
                const inf = m.influencer;
                const name = inf?.display_name || inf?.username || "Afiliado";
                const s = scoreMember(m, now);
                return (
                  <div
                    key={m.user_id}
                    draggable
                    onDragStart={() => setDragUser(m.user_id)}
                    onDragEnd={() => setDragUser(null)}
                    className="rounded-xl bg-card/80 ring-1 ring-white/[0.06] p-2.5 flex items-center gap-2"
                  >
                    <button onClick={() => onSelect(m)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/30 to-accent/10 ring-1 ring-white/[0.06] grid place-items-center shrink-0 overflow-hidden text-[11px] font-bold">
                        {inf?.avatar_url ? <img src={inf.avatar_url} alt="" className="h-full w-full object-cover" /> : (name[0] || "?").toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold truncate">{name}</span>
                        <span className={`text-[10px] font-bold ${s.cls.split(" ").find((c) => c.startsWith("text-")) || "text-muted-foreground/50"}`}>{s.label}</span>
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="shrink-0 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 rounded-md" aria-label="Mover de etapa">
                        <GripVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuLabel className="text-[11px]">Mover para</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {PIPELINE_STAGES.map((st) => (
                          <DropdownMenuItem key={st} className="text-xs gap-2" onSelect={() => onMove(m.user_id, st)}>
                            {st === stage && <Check className="h-3 w-3 text-accent" />}
                            <span className={st === stage ? "" : "pl-5"}>{st}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
              {list.length === 0 && <p className="text-[11px] text-muted-foreground/25 text-center py-4">vazio</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

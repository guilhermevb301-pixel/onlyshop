import { useState } from "react";
import type { TeamReward, CreateRewardInput } from "@/lib/teamRewards";
import { METRIC_LABEL } from "@/lib/teamRewards";
import { Button } from "@/components/ui/button";
import { CreateRewardSheet } from "./CreateRewardSheet";
import { Trophy, Plus, X } from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Recompensas do time (lado marca): lista as ativas + criar/encerrar.
export function RewardsSection({ rewards, onCreate, onCancel }: {
  rewards: TeamReward[]; onCreate: (i: CreateRewardInput) => Promise<boolean>; onCancel: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = rewards.filter((r) => r.status === "active");

  return (
    <div className="space-y-2.5 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5"><Trophy className="h-4 w-4 text-warning" /> Recompensas do time</p>
        <Button onClick={() => setOpen(true)} size="sm" variant="outline" className="h-8 rounded-full gap-1 text-xs border-white/10 bg-white/[0.03]">
          <Plus className="h-3.5 w-3.5" /> Criar
        </Button>
      </div>
      {active.length === 0 ? (
        <button onClick={() => setOpen(true)} className="w-full rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 text-center text-xs text-muted-foreground/60 hover:ring-primary/20 transition-colors">
          Crie um desafio — <span className="text-foreground/80">"quem mais vender ganha R$ 1000"</span> — pra engajar seu time.
        </button>
      ) : (
        <div className="space-y-2">
          {active.map((r) => (
            <div key={r.id} className="rounded-2xl bg-gradient-to-b from-warning/[0.08] to-transparent p-px">
              <div className="rounded-[calc(1rem-1px)] bg-card/80 ring-1 ring-inset ring-warning/10 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 ring-1 ring-warning/20 grid place-items-center shrink-0"><Trophy className="h-5 w-5 text-warning" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {r.prize_amount > 0 ? `${brl(r.prize_amount)} · ` : ""}{METRIC_LABEL[r.metric]}
                    {r.deadline ? ` · até ${new Date(r.deadline).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <button onClick={() => onCancel(r.id)} aria-label="Encerrar recompensa" className="text-muted-foreground/40 hover:text-destructive shrink-0 p-1"><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateRewardSheet open={open} onOpenChange={setOpen} onCreate={onCreate} />
    </div>
  );
}

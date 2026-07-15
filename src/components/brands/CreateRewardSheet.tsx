import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CreateRewardInput, TeamReward } from "@/lib/teamRewards";

const METRICS: { k: TeamReward["metric"]; label: string }[] = [
  { k: "deliveries", label: "Mais entregas" },
  { k: "approvals", label: "Mais aprovações" },
  { k: "sales", label: "Mais vendas" },
];

export function CreateRewardSheet({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreate: (i: CreateRewardInput) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [criteria, setCriteria] = useState("");
  const [metric, setMetric] = useState<TeamReward["metric"]>("deliveries");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Dê um nome pra recompensa"); return; }
    setSaving(true);
    const ok = await onCreate({
      title: title.trim(),
      prize_amount: Number(prize) || 0,
      criteria: criteria.trim() || null,
      metric,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
    setSaving(false);
    if (ok) {
      toast.success("Recompensa criada!", { description: "Seu time já vê o desafio." });
      setTitle(""); setPrize(""); setCriteria(""); setDeadline(""); setMetric("deliveries");
      onOpenChange(false);
    } else {
      toast.error("Não foi possível criar agora");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Nova recompensa</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do desafio</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Campeão de julho" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prêmio (R$)</Label>
              <Input value={prize} onChange={(e) => setPrize(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="1000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Até (opcional)</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Como ganha</Label>
            <div className="flex gap-2">
              {METRICS.map((m) => (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => setMetric(m.k)}
                  className={cn(
                    "flex-1 text-xs px-2 py-2 rounded-xl ring-1 transition-colors",
                    metric === m.k ? "bg-primary/15 text-primary ring-primary/30" : "bg-white/[0.03] text-muted-foreground/60 ring-white/[0.06]"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Detalhes (opcional)</Label>
            <Textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="Quem mais vender em julho leva o prêmio." rows={2} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full h-12 rounded-full gap-2 bg-gradient-primary border-0 font-semibold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Criar recompensa
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

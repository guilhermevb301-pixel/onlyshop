import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  MapPin, Users, Gift, Clock, ClipboardList, ArrowRight, ArrowLeft, Loader2, Sparkles, Rocket, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MIN_REWARD, PERMUTA_FEE, PLATFORM_FEE_PCT } from "@/lib/campaigns";

const GENDERS = [
  { value: "any", label: "Todos" },
  { value: "female", label: "Mulheres" },
  { value: "male", label: "Homens" },
];
const DEADLINES = [
  { value: "24", label: "24 horas" },
  { value: "48", label: "48 horas" },
  { value: "168", label: "7 dias" },
];

interface Props {
  form: any;
  update: (key: any, value: any) => void;
  onSubmit: () => void | Promise<void>;
  loading: boolean;
  budget: { base: number; fee: number; total: number };
  fmt: (v: number) => string;
  isPermuta: boolean;
  slotsN: number;
  rewardN: number;
}

// Wizard passo-a-passo de criar campanha (uma etapa por tela, mobile-first).
// NÃO cria campanha nem toca pagamento — só chama onSubmit() (o handleSubmit da
// casca) no último passo. Reusa o mesmo `form`/`update` da casca.
export function CampaignWizard({ form, update, onSubmit, loading, budget, fmt, isPermuta, slotsN, rewardN }: Props) {
  const [wizardStep, setWizardStep] = useState(0);
  const TOTAL = 5;

  // Validação incremental por passo (a validação final continua no handleSubmit da casca).
  const canAdvance = (): boolean => {
    switch (wizardStep) {
      case 0: return form.name.trim().length >= 2;
      case 1: return !isPermuta || form.physical_item.trim().length > 0;
      case 2: return slotsN >= 1 && (isPermuta || rewardN >= MIN_REWARD);
      default: return true;
    }
  };

  const next = () => {
    if (!canAdvance()) {
      if (wizardStep === 0) toast.error("Dê um título pra campanha.");
      else if (wizardStep === 1) toast.error("Na permuta, descreva o produto.");
      else if (wizardStep === 2) toast.error(isPermuta ? "Defina pelo menos 1 vaga." : `Mínimo R$ ${MIN_REWARD} por influencer e 1 vaga.`);
      return;
    }
    setWizardStep((s) => Math.min(TOTAL - 1, s + 1));
  };
  const back = () => setWizardStep((s) => Math.max(0, s - 1));

  return (
    <div className="mt-4 pb-4">
      {/* progresso */}
      <div className="flex items-center gap-3 mb-4">
        <Progress value={((wizardStep + 1) / TOTAL) * 100} className="h-1.5 flex-1" />
        <span className="text-[10px] font-semibold text-muted-foreground/50 tabular-nums shrink-0">{wizardStep + 1}/{TOTAL}</span>
      </div>

      <div className="min-h-[300px]">
        {/* PASSO 0 — Comece (título + onde) */}
        {wizardStep === 0 && (
          <div className="space-y-4 animate-fade-in">
            <StepHead icon={<Sparkles className="h-4 w-4 text-accent" />} title="Comece pelo básico" sub="Dê um nome e diga onde você quer rodar." />
            <div className="space-y-2">
              <Label className="text-xs">Título da campanha *</Label>
              <Input placeholder="Ex: Vídeos da nova coleção" value={form.name} onChange={(e) => update("name", e.target.value)} className="rounded-xl border-border/20" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-accent" /> Onde (vazio = qualquer lugar)</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input placeholder="Cidade" value={form.target_city} onChange={(e) => update("target_city", e.target.value)} className="rounded-xl border-border/20" />
                <Input placeholder="UF" maxLength={2} value={form.target_state} onChange={(e) => update("target_state", e.target.value.toUpperCase())} className="rounded-xl border-border/20 w-16 uppercase" />
              </div>
              <p className="text-[10px] text-muted-foreground/50">Campanha local aparece pra quem está perto — é onde você compete.</p>
            </div>

            {/* Escopo do domínio — onde você quer ser o dono */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-accent" /> Onde você domina</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["rua", "bairro", "cidade", "zona"] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => update("territory_scope", sc)}
                    className={cn(
                      "rounded-xl border py-2 text-[11px] font-semibold capitalize transition-all active:scale-[.97]",
                      form.territory_scope === sc ? "border-primary/50 bg-primary/[0.1] text-primary" : "border-border/20 bg-muted/10 text-muted-foreground/70"
                    )}
                  >
                    {sc}
                  </button>
                ))}
              </div>
              {form.territory_scope === "rua" && (
                <Input placeholder="Nome da rua (ex: Rua XV de Novembro)" value={form.territory_street} onChange={(e) => update("territory_street", e.target.value)} className="rounded-xl border-border/20" />
              )}
              {form.territory_scope === "bairro" && (
                <Input placeholder="Nome do bairro (ex: Centro)" value={form.territory_neighborhood} onChange={(e) => update("territory_neighborhood", e.target.value)} className="rounded-xl border-border/20" />
              )}
              <p className="text-[10px] text-muted-foreground/50">Quanto mais específico, mais fácil virar o dono do lugar 👑</p>
            </div>
          </div>
        )}

        {/* PASSO 1 — Tipo */}
        {wizardStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <StepHead icon={<Gift className="h-4 w-4 text-accent" />} title="Como você paga?" sub="Dinheiro por vídeo ou produto em permuta." />
            <div className="grid grid-cols-2 gap-2">
              {([
                { t: "per_video", title: "Campanha paga", desc: "R$ por vídeo" },
                { t: "permuta", title: "Permuta", desc: "Produto por vídeo" },
              ]).map((o) => {
                const active = form.reward_type === o.t;
                return (
                  <button key={o.t} type="button" onClick={() => update("reward_type", o.t)}
                    className={cn("rounded-2xl border p-3 text-left transition-all active:scale-[.98]", active ? "border-primary/50 bg-primary/[0.08] ring-1 ring-primary/30" : "border-border/20 bg-muted/10 hover:border-border/40")}>
                    <p className="text-sm font-bold">{o.title}</p>
                    <p className="text-[11px] text-muted-foreground/60">{o.desc}</p>
                  </button>
                );
              })}
            </div>
            {isPermuta ? (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-accent" /> Produto que o influencer recebe *</Label>
                <Input placeholder="Ex: 1 vestido à escolha, kit degustação..." value={form.physical_item} onChange={(e) => update("physical_item", e.target.value)} className="rounded-xl border-border/20" />
              </div>
            ) : (
              <div className="rounded-2xl border border-border/20 bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-accent" /> Vou enviar um produto físico</Label>
                  <Switch checked={form.hasItem} onCheckedChange={(v) => update("hasItem", v)} />
                </div>
                {form.hasItem && (
                  <Input placeholder="Ex: 1 vestido à escolha, kit degustação..." value={form.physical_item} onChange={(e) => update("physical_item", e.target.value)} className="rounded-xl border-border/20" />
                )}
              </div>
            )}
          </div>
        )}

        {/* PASSO 2 — Orçamento */}
        {wizardStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <StepHead icon={<Users className="h-4 w-4 text-accent" />} title="Vagas e valor" sub="Quantos influencers e quanto cada um recebe." />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Vagas</Label>
                <Input type="number" min="1" inputMode="numeric" value={form.slots} onChange={(e) => update("slots", e.target.value)} className="rounded-xl border-border/20" />
              </div>
              {isPermuta ? (
                <div className="space-y-2">
                  <Label className="text-xs">Taxa da plataforma</Label>
                  <div className="rounded-xl border border-border/20 bg-muted/10 px-3 h-10 flex items-center text-sm text-muted-foreground/80">R$ {PERMUTA_FEE} / vaga</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">R$ por influencer (mín. {MIN_REWARD})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/40">R$</span>
                    <Input type="number" min={MIN_REWARD} step="1" inputMode="decimal" value={form.reward_amount} onChange={(e) => update("reward_amount", e.target.value)} className="rounded-xl border-border/20 pl-8" />
                  </div>
                </div>
              )}
            </div>
            <BudgetBox isPermuta={isPermuta} slotsN={slotsN} rewardN={rewardN} budget={budget} fmt={fmt} />
          </div>
        )}

        {/* PASSO 3 — Detalhes/requisitos */}
        {wizardStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <StepHead icon={<ClipboardList className="h-4 w-4 text-accent" />} title="O que você espera" sub="Briefing e público — o influencer vê antes de aceitar." />
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="O que o influencer precisa mostrar no vídeo..." value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} className="rounded-xl border-border/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-accent" /> Briefing / exigências</Label>
              <Textarea placeholder={"Ex:\n• Marcar @sualoja\n• Mostrar o produto 5s+\n• Postar até sexta"} value={form.briefing} onChange={(e) => update("briefing", e.target.value)} rows={3} className="rounded-xl border-border/20 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Gênero</Label>
                <Select value={form.target_gender} onValueChange={(v) => update("target_gender", v)}>
                  <SelectTrigger className="rounded-xl border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mín. seguidores</Label>
                <Input type="number" min="0" inputMode="numeric" value={form.min_followers} onChange={(e) => update("min_followers", e.target.value)} className="rounded-xl border-border/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Prazo de entrega</Label>
              <Select value={form.deadline_hours} onValueChange={(v) => update("deadline_hours", v)}>
                <SelectTrigger className="rounded-xl border-border/20"><SelectValue /></SelectTrigger>
                <SelectContent>{DEADLINES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* PASSO 4 — Revisar */}
        {wizardStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <StepHead icon={<Rocket className="h-4 w-4 text-accent" />} title="Revisar e publicar" sub="Confira e pague pra entrar no ar." />
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 space-y-2 text-sm">
              <Row label="Campanha" value={form.name || "—"} />
              <Row label="Tipo" value={isPermuta ? "Permuta" : "Paga"} />
              <Row label="Vagas" value={String(slotsN)} />
              <Row label={isPermuta ? "Produto" : "Por influencer"} value={isPermuta ? (form.physical_item || "—") : fmt(rewardN)} />
              {(form.target_city || form.target_state) && <Row label="Onde" value={`${form.target_city}${form.target_state ? ` / ${form.target_state}` : ""}`} />}
            </div>
            <BudgetBox isPermuta={isPermuta} slotsN={slotsN} rewardN={rewardN} budget={budget} fmt={fmt} highlight />
          </div>
        )}
      </div>

      {/* ações */}
      <div className="flex items-center gap-2 mt-5">
        {wizardStep > 0 && (
          <Button type="button" variant="outline" onClick={back} className="rounded-full h-12 gap-1.5 border-border/40">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        )}
        {wizardStep < TOTAL - 1 ? (
          <Button type="button" onClick={next} className="group flex-1 rounded-full h-12 gap-2 bg-gradient-primary border-0 text-primary-foreground active:scale-[.98] transition-transform shadow-[var(--shadow-glow-cta)]">
            Continuar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        ) : (
          <Button type="button" onClick={() => onSubmit()} disabled={loading} className="group flex-1 rounded-full h-12 gap-2 bg-gradient-primary border-0 text-primary-foreground active:scale-[.98] transition-transform shadow-[var(--shadow-glow-cta)] disabled:opacity-70" aria-busy={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</> : <>Publicar e pagar <ArrowRight className="h-4 w-4" /></>}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20 mt-0.5">{icon}</span>
      <div>
        <h3 className="text-base font-bold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground/60 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-right truncate">{value}</span>
    </div>
  );
}

function BudgetBox({ isPermuta, slotsN, rewardN, budget, fmt, highlight }: {
  isPermuta: boolean; slotsN: number; rewardN: number; budget: { base: number; fee: number; total: number }; fmt: (v: number) => string; highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", highlight ? "border-accent/30 bg-accent/[0.06]" : budget.total > 0 ? "border-primary/30 bg-primary/[0.06]" : "border-border/20 bg-muted/10")}>
      {isPermuta ? (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
          <span>{slotsN} vagas × {fmt(PERMUTA_FEE)} (taxa)</span><span>{fmt(budget.total)}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/60"><span>{slotsN} vagas × {fmt(rewardN)}</span><span>{fmt(budget.base)}</span></div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/40 mt-1"><span>Taxa da plataforma ({PLATFORM_FEE_PCT}%)</span><span>{fmt(budget.fee)}</span></div>
        </>
      )}
      <div className="h-px bg-border/30 my-2" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">Total da campanha</span>
        <span className={cn("text-lg font-black tabular-nums", highlight ? "text-accent" : "text-primary")}>{fmt(budget.total)}</span>
      </div>
    </div>
  );
}

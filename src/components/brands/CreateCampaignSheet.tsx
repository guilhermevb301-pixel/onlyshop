import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight, Loader2, MapPin, Users, Gift, Clock, Wallet, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CampaignPaymentStep } from "./CampaignPaymentStep";
import {
  computeBudget, computePermutaBudget, PLATFORM_FEE_PCT, PERMUTA_FEE, MIN_REWARD,
  type Campaign, type TargetGender,
} from "@/lib/campaigns";
import type { CreateCampaignInput } from "@/hooks/useBrand";

interface Props {
  onCreate: (data: CreateCampaignInput) => Promise<Campaign | null>;
  onFunded: (campaignId: string) => Promise<void>;
  triggerLabel?: string;                 // customiza o texto do botão de abrir
  triggerVariant?: "default" | "link";   // "link" = botão discreto (ex: "Pagar agora")
  resumeCampaign?: Campaign | null;      // abre direto no pagamento de uma campanha já criada
}

type Step = "form" | "payment";

const DEADLINES = [
  { value: "24", label: "24 horas" },
  { value: "48", label: "48 horas" },
  { value: "168", label: "7 dias" },
];

const GENDERS: { value: TargetGender; label: string }[] = [
  { value: "any", label: "Todos" },
  { value: "female", label: "Mulheres" },
  { value: "male", label: "Homens" },
];

const empty = {
  name: "", description: "", briefing: "",
  reward_type: "per_video" as "per_video" | "permuta",
  hasItem: false, physical_item: "",
  slots: "5", reward_amount: "50",
  target_city: "", target_state: "",
  target_gender: "any" as TargetGender,
  min_followers: "0",
  deadline_hours: "168",
};

export function CreateCampaignSheet({ onCreate, onFunded, triggerLabel, triggerVariant = "default", resumeCampaign }: Props) {
  const isResume = !!resumeCampaign;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(isResume ? "payment" : "form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);
  const [created, setCreated] = useState<Campaign | null>(resumeCampaign ?? null);

  const update = (key: keyof typeof empty, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  const slotsN = parseInt(form.slots) || 0;
  const rewardN = parseFloat(form.reward_amount) || 0;
  const isPermuta = form.reward_type === "permuta";
  const budget = isPermuta ? computePermutaBudget(slotsN) : computeBudget(slotsN, rewardN);
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // No modo "retomar pagamento" não há form pra resetar — volta direto ao pagamento.
  const reset = () => {
    if (isResume) { setStep("payment"); setCreated(resumeCampaign ?? null); return; }
    setForm(empty); setStep("form"); setCreated(null);
  };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(reset, 200);
  };

  // Cria o gig (funded=false) e avança pro pagamento.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Dê um título pra campanha."); return; }
    if (slotsN < 1) { toast.error("Defina pelo menos 1 vaga."); return; }
    if (isPermuta) {
      if (!form.physical_item.trim()) { toast.error("Na permuta, descreva o produto que o influencer recebe."); return; }
    } else if (rewardN < MIN_REWARD) {
      toast.error(`O valor mínimo é R$ ${MIN_REWARD} por influencer.`); return;
    }
    setLoading(true);
    try {
      const camp = await onCreate({
        name: form.name.trim(),
        description: form.description.trim() || null,
        briefing: form.briefing.trim() || null,
        reward_type: form.reward_type,
        reward_amount: isPermuta ? 0 : rewardN,
        slots: slotsN,
        target_city: form.target_city.trim() || null,
        target_state: form.target_state.trim() || null,
        target_gender: form.target_gender,
        min_followers: parseInt(form.min_followers) || 0,
        deadline_hours: parseInt(form.deadline_hours) || 168,
        physical_item: isPermuta
          ? (form.physical_item.trim() || null)
          : (form.hasItem ? (form.physical_item.trim() || null) : null),
      });
      if (!camp) throw new Error("Não foi possível criar a campanha.");
      setCreated(camp);
      setStep("payment");
    } catch (err: any) {
      toast.error("Erro", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePaid = async (realPayment: boolean) => {
    // Pagamento REAL: NÃO marca funded aqui — o webhook do Mercado Pago confirma o
    // pagamento e coloca a campanha no ar. Ela já aparece no painel como "aguardando
    // pagamento". Só o demo (sem webhook) marca funded na hora.
    if (created && !realPayment) await onFunded(created.id);
    handleClose(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetTrigger asChild>
        {triggerVariant === "link" ? (
          <Button
            variant="link"
            className="h-auto p-0 text-xs font-semibold text-primary gap-1 hover:text-primary/80"
          >
            <Wallet className="h-3.5 w-3.5" /> {triggerLabel ?? "Pagar agora"}
          </Button>
        ) : (
          <Button className="group rounded-full bg-gradient-primary border-0 text-primary-foreground gap-2 active:scale-[.98] transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] shadow-[var(--shadow-glow-cta)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:rotate-90">
              <Plus className="h-3.5 w-3.5" />
            </span>
            {triggerLabel ?? "Nova campanha"}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto border-border/20">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">
            {step === "form" ? "Nova campanha" : isResume ? "Concluir pagamento" : "Pagamento"}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            {step === "form"
              ? "Influencers locais gravam vídeos do seu produto. Você só paga por entrega aprovada."
              : isResume
                ? `Finalize o pagamento da campanha "${created?.name}" pra ela entrar no ar.`
                : "Confirme o valor e publique sua campanha."}
          </SheetDescription>
        </SheetHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-6">
            <div className="space-y-2">
              <Label className="text-xs">Título da campanha *</Label>
              <Input
                placeholder="Ex: Vídeos da nova coleção"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="rounded-xl border-border/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="O que o influencer precisa mostrar no vídeo..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={2}
                className="rounded-xl border-border/20"
              />
            </div>

            {/* Briefing estruturado — exigências que o influencer vê antes de aceitar */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-accent" /> Briefing / exigências</Label>
              <Textarea
                placeholder={"Ex:\n• Marcar @sualoja no vídeo\n• Mostrar o produto por 5s+\n• Postar até sexta\n• Não usar concorrentes"}
                value={form.briefing}
                onChange={(e) => update("briefing", e.target.value)}
                rows={4}
                className="rounded-xl border-border/20 text-xs"
              />
              <p className="text-[10px] text-muted-foreground/50">O influencer vê isso antes de aceitar — deixa claro o que você espera.</p>
            </div>

            {/* Tipo: campanha paga vs permuta */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { t: "per_video" as const, title: "Campanha paga", desc: "R$ por vídeo" },
                { t: "permuta" as const, title: "Permuta", desc: "Produto por vídeo" },
              ]).map((o) => {
                const active = form.reward_type === o.t;
                return (
                  <button
                    key={o.t}
                    type="button"
                    onClick={() => update("reward_type", o.t)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-all active:scale-[.98]",
                      active ? "border-primary/50 bg-primary/[0.08] ring-1 ring-primary/30" : "border-border/20 bg-muted/10 hover:border-border/40"
                    )}
                  >
                    <p className="text-sm font-bold">{o.title}</p>
                    <p className="text-[11px] text-muted-foreground/60">{o.desc}</p>
                  </button>
                );
              })}
            </div>

            {isPermuta ? (
              /* Permuta: o produto é OBRIGATÓRIO (é o que o influencer recebe) */
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-accent" /> Produto que o influencer recebe *</Label>
                <Input
                  placeholder="Ex: 1 vestido à escolha, kit degustação..."
                  value={form.physical_item}
                  onChange={(e) => update("physical_item", e.target.value)}
                  className="rounded-xl border-border/20"
                />
              </div>
            ) : (
              /* Paga: produto físico opcional */
              <div className="rounded-2xl border border-border/20 bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-accent" /> Vou enviar um produto físico</Label>
                  <Switch checked={form.hasItem} onCheckedChange={(v) => update("hasItem", v)} />
                </div>
                {form.hasItem && (
                  <Input
                    placeholder="Ex: 1 vestido à escolha, kit degustação..."
                    value={form.physical_item}
                    onChange={(e) => update("physical_item", e.target.value)}
                    className="rounded-xl border-border/20"
                  />
                )}
              </div>
            )}

            {/* Vagas + (valor por influencer OU taxa da permuta) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Vagas (influencers)</Label>
                <Input
                  type="number" min="1" inputMode="numeric"
                  value={form.slots}
                  onChange={(e) => update("slots", e.target.value)}
                  className="rounded-xl border-border/20"
                />
              </div>
              {isPermuta ? (
                <div className="space-y-2">
                  <Label className="text-xs">Taxa da plataforma</Label>
                  <div className="rounded-xl border border-border/20 bg-muted/10 px-3 h-10 flex items-center text-sm text-muted-foreground/80">
                    R$ {PERMUTA_FEE} / vaga
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">R$ por influencer (mín. R$ {MIN_REWARD})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/40">R$</span>
                    <Input
                      type="number" min={MIN_REWARD} step="1" inputMode="decimal"
                      value={form.reward_amount}
                      onChange={(e) => update("reward_amount", e.target.value)}
                      className="rounded-xl border-border/20 pl-8"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filtros de público */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-accent" /> Onde (deixe vazio = qualquer lugar)</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  placeholder="Cidade"
                  value={form.target_city}
                  onChange={(e) => update("target_city", e.target.value)}
                  className="rounded-xl border-border/20"
                />
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={form.target_state}
                  onChange={(e) => update("target_state", e.target.value.toUpperCase())}
                  className="rounded-xl border-border/20 w-16 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Gênero</Label>
                <Select value={form.target_gender} onValueChange={(v) => update("target_gender", v)}>
                  <SelectTrigger className="rounded-xl border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mín. seguidores</Label>
                <Input
                  type="number" min="0" inputMode="numeric"
                  value={form.min_followers}
                  onChange={(e) => update("min_followers", e.target.value)}
                  className="rounded-xl border-border/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Prazo de entrega</Label>
              <Select value={form.deadline_hours} onValueChange={(v) => update("deadline_hours", v)}>
                <SelectTrigger className="rounded-xl border-border/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEADLINES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Resumo de custo ao vivo */}
            <div className={cn(
              "rounded-2xl border p-4 transition-colors",
              budget.total > 0 ? "border-primary/30 bg-primary/[0.06]" : "border-border/20 bg-muted/10"
            )}>
              {isPermuta ? (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
                  <span>{slotsN} vagas × {fmt(PERMUTA_FEE)} (taxa)</span>
                  <span>{fmt(budget.total)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>{slotsN} vagas × {fmt(rewardN)}</span>
                    <span>{fmt(budget.base)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/40 mt-1">
                    <span>Taxa da plataforma ({PLATFORM_FEE_PCT}%)</span>
                    <span>{fmt(budget.fee)}</span>
                  </div>
                </>
              )}
              <div className="h-px bg-border/30 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Total da campanha</span>
                <span className="text-lg font-black text-primary">{fmt(budget.total)}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="group w-full rounded-full bg-gradient-primary border-0 text-primary-foreground h-12 gap-2 active:scale-[.98] transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] shadow-[var(--shadow-glow-cta)] disabled:opacity-70 disabled:active:scale-100"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span className="sr-only">Publicando campanha</span>Publicando...</>
              ) : (
                <>
                  Publicar e pagar
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </>
              )}
            </Button>
          </form>
        ) : created ? (
          <div className="mt-4 pb-6">
            <CampaignPaymentStep
              campaign={created}
              onPaid={handlePaid}
              onBack={isResume ? () => handleClose(false) : () => setStep("form")}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

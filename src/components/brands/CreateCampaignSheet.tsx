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
import { Plus, ArrowRight, Loader2, MapPin, Users, Gift, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CampaignPaymentStep } from "./CampaignPaymentStep";
import {
  computeBudget, PLATFORM_FEE_PCT,
  type Campaign, type TargetGender,
} from "@/lib/campaigns";
import type { CreateCampaignInput } from "@/hooks/useBrand";

interface Props {
  onCreate: (data: CreateCampaignInput) => Promise<Campaign | null>;
  onFunded: (campaignId: string) => Promise<void>;
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
  name: "", description: "",
  hasItem: false, physical_item: "",
  slots: "5", reward_amount: "50",
  target_city: "", target_state: "",
  target_gender: "any" as TargetGender,
  min_followers: "0",
  deadline_hours: "168",
};

export function CreateCampaignSheet({ onCreate, onFunded }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);
  const [created, setCreated] = useState<Campaign | null>(null);

  const update = (key: keyof typeof empty, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  const slotsN = parseInt(form.slots) || 0;
  const rewardN = parseFloat(form.reward_amount) || 0;
  const budget = computeBudget(slotsN, rewardN);
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const reset = () => { setForm(empty); setStep("form"); setCreated(null); };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(reset, 200);
  };

  // Cria o gig (funded=false) e avança pro pagamento.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Dê um título pra campanha."); return; }
    if (slotsN < 1) { toast.error("Defina pelo menos 1 vaga."); return; }
    if (rewardN <= 0) { toast.error("Defina o valor por influencer."); return; }
    setLoading(true);
    try {
      const camp = await onCreate({
        name: form.name.trim(),
        description: form.description.trim() || null,
        reward_amount: rewardN,
        slots: slotsN,
        target_city: form.target_city.trim() || null,
        target_state: form.target_state.trim() || null,
        target_gender: form.target_gender,
        min_followers: parseInt(form.min_followers) || 0,
        deadline_hours: parseInt(form.deadline_hours) || 168,
        physical_item: form.hasItem ? (form.physical_item.trim() || null) : null,
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

  const handlePaid = async () => {
    if (created) await onFunded(created.id);
    handleClose(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetTrigger asChild>
        <Button className="rounded-full bg-gradient-primary border-0 text-primary-foreground gap-1.5">
          <Plus className="h-4 w-4" /> Nova campanha
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto border-border/20">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">
            {step === "form" ? "Nova campanha" : "Pagamento"}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            {step === "form"
              ? "Influencers locais gravam vídeos do seu produto. Você só paga por entrega aprovada."
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

            {/* Item físico opcional */}
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

            {/* Vagas + valor */}
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
              <div className="space-y-2">
                <Label className="text-xs">R$ por influencer</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/40">R$</span>
                  <Input
                    type="number" min="1" step="1" inputMode="decimal"
                    value={form.reward_amount}
                    onChange={(e) => update("reward_amount", e.target.value)}
                    className="rounded-xl border-border/20 pl-8"
                  />
                </div>
              </div>
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
              <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
                <span>{slotsN} vagas × {fmt(rewardN)}</span>
                <span>{fmt(budget.base)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground/40 mt-1">
                <span>Taxa da plataforma ({PLATFORM_FEE_PCT}%)</span>
                <span>{fmt(budget.fee)}</span>
              </div>
              <div className="h-px bg-border/30 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Total da campanha</span>
                <span className="text-lg font-black text-primary">{fmt(budget.total)}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-gradient-primary border-0 text-primary-foreground h-11 gap-1.5"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Publicar e pagar <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        ) : created ? (
          <div className="mt-4 pb-6">
            <CampaignPaymentStep
              campaign={created}
              onPaid={handlePaid}
              onBack={() => setStep("form")}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

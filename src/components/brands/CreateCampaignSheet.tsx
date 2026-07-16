import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { CampaignPaymentStep } from "./CampaignPaymentStep";
import { CampaignWizard } from "./CampaignWizard";
import {
  computeBudget, computePermutaBudget, MIN_REWARD,
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
  territory_scope: "cidade" as "rua" | "bairro" | "cidade" | "zona",
  territory_neighborhood: "", territory_street: "",
  target_gender: "any" as TargetGender,
  min_followers: "0",
  deadline_hours: "168",
  auto_approve: false,
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
  const handleSubmit = async () => {
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
        territory_scope: form.territory_scope,
        territory_name:
          form.territory_scope === "rua" ? (form.territory_street.trim() || null)
          : form.territory_scope === "bairro" ? (form.territory_neighborhood.trim() || null)
          : (form.target_city.trim() || null),
        territory_neighborhood: form.territory_neighborhood.trim() || null,
        territory_street: form.territory_street.trim() || null,
        auto_approve: form.auto_approve,
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
          <CampaignWizard
            form={form}
            update={update}
            onSubmit={handleSubmit}
            loading={loading}
            budget={budget}
            fmt={fmt}
            isPermuta={isPermuta}
            slotsN={slotsN}
            rewardN={rewardN}
          />
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

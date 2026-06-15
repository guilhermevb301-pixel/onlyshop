import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import {
  Megaphone,
  CreditCard,
  QrCode,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Users,
  Clock,
  MapPin,
  Rocket,
  Lock,
  Compass,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CampaignNear,
  computeBudget,
  demo,
  demoId,
  PLATFORM_FEE_PCT,
} from "@/lib/campaigns";

type PaymentMethod = "pix" | "card";

// Resumo genérico quando a tela é aberta sem campanha no state (ex.: link direto).
const FALLBACK_CAMPAIGN: CampaignNear = {
  campaign_id: "novo",
  brand_id: "minha-loja",
  brand_name: "Sua loja",
  title: "Nova campanha",
  reward_amount: 50,
  reward_type: "per_video",
  slots: 10,
  slots_filled: 0,
  target_city: null,
  target_state: null,
  physical_item: null,
  deadline_hours: 168,
  distance_km: 0,
  brand_lat: 0,
  brand_lon: 0,
  category: null,
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const deadlineLabel = (h: number) =>
  h <= 24 ? "24h" : h <= 48 ? "48h" : `${Math.round(h / 24)} dias`;

const methodLabel = (m: PaymentMethod) => (m === "pix" ? "PIX" : "Cartão");

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const campaign: CampaignNear =
    (location.state as { campaign?: CampaignNear } | null)?.campaign ?? FALLBACK_CAMPAIGN;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [processing, setProcessing] = useState(false);
  const [funded, setFunded] = useState(false);

  // Sem login não dá pra financiar — manda pro auth.
  if (!user) return <Navigate to="/auth" replace />;

  // Campanha vazia (link direto sem state): não dá pra cobrar R$600 de uma campanha fake.
  const hasCampaign = campaign.campaign_id !== "novo";

  // Custo da campanha pro lojista: base (vagas × recompensa) + taxa da plataforma.
  const { base, fee, total } = computeBudget(campaign.slots, campaign.reward_amount);

  // ===========================================================================
  // Estado vazio caprichado — abriu o checkout sem escolher campanha.
  // ===========================================================================
  if (!hasCampaign) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-in">
        <header className="flex items-center gap-3 mb-10">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            className="rounded-xl h-11 w-11 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-accent">
              Checkout
            </span>
            <h1 className="text-xl font-bold leading-tight">Financiar campanha</h1>
          </div>
        </header>

        <div className="rounded-[1.5rem] p-[1.5px] bg-gradient-to-b from-white/10 to-transparent">
          <div className="rounded-[1.4rem] bg-card/80 backdrop-blur-xl shadow-[var(--shadow-bezel-inset)] px-6 py-12 text-center space-y-5">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 ring-1 ring-primary/20 grid place-items-center">
              <Compass className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/50">
                Nenhuma campanha selecionada
              </span>
              <h2 className="text-lg font-bold">Escolha uma campanha primeiro</h2>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                Selecione quais vagas você quer pagar antes de financiar — assim o resumo
                bate com a campanha certa.
              </p>
            </div>
            <Button
              className="group w-full bg-gradient-primary border-0 rounded-2xl h-12 text-base font-semibold shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform duration-200 [transition-timing-function:var(--ease-fluid)]"
              onClick={() => navigate("/brands")}
            >
              Escolher campanha
              <span className="ml-2 h-7 w-7 rounded-full bg-white/15 grid place-items-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Tela de sucesso — "Campanha no ar!".
  // ===========================================================================
  if (funded) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center space-y-6 animate-fade-in">
        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-success flex items-center justify-center shadow-[0_0_40px_hsl(174_100%_47%/0.4)]">
          <Rocket className="h-10 w-10 text-white" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-accent">
            Pagamento confirmado
          </span>
          <h1 className="text-2xl font-bold">Campanha no ar! 🚀</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A <span className="font-semibold text-foreground">{campaign.title}</span> já está
            aparecendo no radar dos creators perto de você. Você é avisado a cada entrega.
          </p>
        </div>

        <div className="rounded-[1.5rem] p-[1.5px] bg-gradient-to-b from-white/[0.08] to-transparent text-left">
          <div className="rounded-[1.4rem] bg-card/70 backdrop-blur-xl shadow-[var(--shadow-bezel-inset)] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground/70">
              <span>Investido</span>
              <span className="font-bold text-accent tabular-nums">{fmt(total)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground/70">
              <span>Vagas para creators</span>
              <span className="font-semibold text-foreground tabular-nums">{campaign.slots}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground/70">
              <span>Forma de pagamento</span>
              <span className="font-semibold text-foreground">{methodLabel(paymentMethod)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            className="group bg-gradient-primary border-0 rounded-2xl h-12 font-semibold shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform duration-200 [transition-timing-function:var(--ease-fluid)]"
            onClick={() => navigate("/brands")}
          >
            Ver minhas campanhas
            <span className="ml-2 h-7 w-7 rounded-full bg-white/15 grid place-items-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl h-11 active:scale-[.98] transition-transform duration-200 [transition-timing-function:var(--ease-fluid)]"
            onClick={() => navigate("/inicio")}
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const handlePay = async () => {
    setProcessing(true);
    try {
      if (demo.isOn()) {
        // Demo: registra o crédito (topup) e a reserva da verba (campaign_hold) no ledger.
        // IMPORTANTE (dinheiro): grava em user_id = user.id do auth (NÃO brand_id),
        // pra a Carteira/Ganhos — que leem por user.id — ficarem consistentes.
        const ref = demoId("camp");
        const provider = paymentMethod === "pix" ? "pix" : "mercadopago";
        const now = new Date().toISOString();
        demo.addCredit({
          id: demoId("cr"),
          user_id: user.id,
          kind: "topup",
          amount: total,
          campaign_id: campaign.campaign_id,
          status: "completed",
          provider,
          provider_ref: ref,
          created_at: now,
        });
        demo.addCredit({
          id: demoId("cr"),
          user_id: user.id,
          kind: "campaign_hold",
          amount: -total,
          campaign_id: campaign.campaign_id,
          status: "held",
          provider,
          provider_ref: ref,
          created_at: now,
        });
        // Delay deliberado pra o spinner/sensação de processamento aparecer na demo.
        await new Promise((r) => setTimeout(r, 900));
      } else {
        // TODO Mercado Pago fund-campaign: criar preferência de pagamento (PIX/cartão),
        // confirmar via webhook e gravar topup + campaign_hold em platform_credits.
        // const { data } = await supabase.functions.invoke("fund-campaign", {
        //   body: { campaign_id: campaign.campaign_id, amount: total, method: paymentMethod },
        // });
        await new Promise((r) => setTimeout(r, 600)); // placeholder até o gateway entrar
      }

      setFunded(true);
      toast({
        title: "Campanha no ar! 🚀",
        description: `${fmt(total)} reservados. Os creators já podem se candidatar.`,
      });
    } catch (err) {
      console.error("Erro ao financiar campanha:", err);
      toast({
        variant: "destructive",
        title: "Erro ao processar pagamento",
        description: "Tente novamente em instantes.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3 animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Voltar"
          className="rounded-xl h-11 w-11 shrink-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-accent">
            Checkout · Passo final
          </span>
          <h1 className="text-xl font-bold leading-tight">Financiar campanha</h1>
          <p className="text-xs text-muted-foreground/60">
            Coloque sua campanha no radar dos creators
          </p>
        </div>
      </header>

      {/* Resumo da campanha */}
      <section
        className="animate-slide-up opacity-0"
        style={{ animationDelay: "60ms", animationFillMode: "forwards" }}
      >
        <div className="rounded-[1.5rem] p-[1.5px] bg-gradient-to-b from-white/[0.08] to-transparent">
          <div className="rounded-[1.4rem] bg-card/80 backdrop-blur-xl shadow-[var(--shadow-bezel-inset)] p-4 space-y-3.5">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/50 flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5 text-primary" /> Resumo da campanha
            </h2>

            <div className="space-y-1">
              <p className="text-base font-bold leading-tight">{campaign.title}</p>
              <p className="text-xs text-muted-foreground/60">{campaign.brand_name}</p>
            </div>

            {/* Métricas rápidas */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <Metric icon={Users} label="Vagas" value={String(campaign.slots)} />
              <Metric icon={Clock} label="Prazo" value={deadlineLabel(campaign.deadline_hours)} />
              <Metric
                icon={MapPin}
                label="Local"
                value={campaign.target_city ?? "Perto de você"}
              />
            </div>

            {campaign.physical_item && (
              <p className="text-[11px] text-muted-foreground/60">
                Brinde por entrega:{" "}
                <span className="text-foreground">{campaign.physical_item}</span>
              </p>
            )}

            {/* Breakdown do orçamento (base + taxa + total) */}
            <div className="divide-y divide-border/30 pt-0.5">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  {campaign.slots} vagas × {fmt(campaign.reward_amount)}
                </span>
                <span className="text-sm font-semibold tabular-nums">{fmt(base)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  Taxa da plataforma ({PLATFORM_FEE_PCT}%)
                </span>
                <span className="text-sm font-semibold tabular-nums">{fmt(fee)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="font-semibold">Total a pagar</span>
              <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent tabular-nums">
                {fmt(total)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
              Você só paga 1x — as vagas não preenchidas voltam pro seu saldo.
            </p>
          </div>
        </div>
      </section>

      {/* Forma de pagamento */}
      <section
        className="space-y-3 animate-slide-up opacity-0"
        style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
      >
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/50">
          Forma de pagamento
        </h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de pagamento">
          <PaymentOption
            icon={QrCode}
            label="PIX"
            hint="Instantâneo"
            active={paymentMethod === "pix"}
            onSelect={() => setPaymentMethod("pix")}
          />
          <PaymentOption
            icon={CreditCard}
            label="Cartão"
            hint="Crédito/Débito"
            active={paymentMethod === "card"}
            onSelect={() => setPaymentMethod("card")}
          />
        </div>
        {/* Reflexo da escolha pra a demo não parecer sem efeito */}
        <p className="text-[11px] text-muted-foreground/50 pl-1">
          {paymentMethod === "pix"
            ? "QR Code gerado na confirmação · cai na hora."
            : "Parcele em até 12x · aprovação na hora."}
        </p>
      </section>

      {/* Badge de segurança */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-accent/[0.06] ring-1 ring-accent/15 text-muted-foreground animate-slide-up opacity-0"
        style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
      >
        <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
        <p className="text-xs leading-snug">
          A verba fica reservada e só é liberada pro creator quando você aprova a entrega.
        </p>
      </div>

      {/* Pagar */}
      <div
        className="space-y-3 animate-slide-up opacity-0"
        style={{ animationDelay: "240ms", animationFillMode: "forwards" }}
      >
        <Button
          className="group w-full bg-gradient-primary border-0 rounded-2xl h-14 text-base font-semibold shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform duration-200 [transition-timing-function:var(--ease-fluid)]"
          onClick={handlePay}
          disabled={processing || total <= 0}
          aria-busy={processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {paymentMethod === "pix" ? "Gerando PIX…" : "Processando…"}
              <span className="sr-only">Processando pagamento</span>
            </>
          ) : (
            <>
              {`Pagar ${fmt(total)}`}
              <span className="ml-2 h-7 w-7 rounded-full bg-white/15 grid place-items-center group-hover:translate-x-0.5 transition-transform">
                <Lock className="h-3.5 w-3.5" />
              </span>
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground/40">
          Sem campanha definida?{" "}
          <Link to="/brands" className="text-primary hover:underline">
            Volte e escolha uma
          </Link>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Opção de pagamento (PIX / Cartão) — double-bezel, ícone em círculo, física no toque.
// =============================================================================
function PaymentOption({
  icon: Icon,
  label,
  hint,
  active,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "rounded-[1.25rem] p-[1.5px] text-left active:scale-[.98] transition-transform duration-200 [transition-timing-function:var(--ease-fluid)]",
        active
          ? "bg-gradient-to-b from-primary/50 to-primary/10"
          : "bg-gradient-to-b from-white/10 to-transparent"
      )}
    >
      <div
        className={cn(
          "rounded-[1.1rem] bg-card px-4 py-4 flex flex-col items-center gap-2.5 transition-shadow duration-200",
          active
            ? "ring-1 ring-primary/40 shadow-[0_0_24px_hsl(var(--primary)/0.18)]"
            : "ring-1 ring-transparent"
        )}
      >
        <span
          className={cn(
            "h-11 w-11 rounded-full grid place-items-center transition-colors",
            active ? "bg-primary/15" : "bg-muted/40"
          )}
        >
          <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
        </span>
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-[11px] text-muted-foreground/60">{hint}</span>
      </div>
    </button>
  );
}

// Mini-card de métrica do resumo (vagas / prazo / local).
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.1rem] bg-muted/30 ring-1 ring-white/[0.04] shadow-[var(--shadow-bezel-inset)] p-2.5 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-accent mb-1" />
      <p className="text-xs font-bold leading-tight line-clamp-1" title={value}>
        {value}
      </p>
      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
        {label}
      </span>
    </div>
  );
}

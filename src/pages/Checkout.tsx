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
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
  Clock,
  MapPin,
  Rocket,
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

  // Custo da campanha pro lojista: base (vagas × recompensa) + taxa da plataforma.
  const { base, fee, total } = computeBudget(campaign.slots, campaign.reward_amount);

  // Tela de sucesso — "Campanha no ar!".
  if (funded) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6 animate-fade-in">
        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-success flex items-center justify-center shadow-[0_0_40px_hsl(174_100%_47%/0.4)]">
          <Rocket className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Campanha no ar! 🚀</h1>
        <p className="text-muted-foreground text-sm">
          A <span className="font-semibold text-foreground">{campaign.title}</span> já está
          aparecendo no radar dos creators perto de você. Você é avisado a cada entrega.
        </p>
        <div className="rounded-2xl border border-border/40 p-4 text-left space-y-2 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground/70">
            <span>Investido</span>
            <span className="font-bold text-accent">{fmt(total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground/70">
            <span>Vagas para creators</span>
            <span className="font-semibold text-foreground">{campaign.slots}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            className="bg-gradient-primary border-0 rounded-xl h-12 font-semibold"
            onClick={() => navigate("/discover")}
          >
            Ver creators perto de você
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/inicio")}>
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
        const ref = demoId("camp");
        demo.addCredit({
          id: demoId("cr"),
          user_id: user.id,
          kind: "topup",
          amount: total,
          campaign_id: campaign.campaign_id,
          status: "completed",
          provider: paymentMethod === "pix" ? "pix" : "mercadopago",
          provider_ref: ref,
          created_at: new Date().toISOString(),
        });
        demo.addCredit({
          id: demoId("cr"),
          user_id: user.id,
          kind: "campaign_hold",
          amount: -total,
          campaign_id: campaign.campaign_id,
          status: "held",
          provider: paymentMethod === "pix" ? "pix" : "mercadopago",
          provider_ref: ref,
          created_at: new Date().toISOString(),
        });
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
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Financiar campanha</h1>
          <p className="text-[11px] text-muted-foreground/50">Coloque sua campanha no radar dos creators</p>
        </div>
      </div>

      {/* Resumo da campanha */}
      <div className="rounded-2xl border border-border/50 p-4 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Resumo da campanha
        </h2>

        <div className="space-y-1">
          <p className="text-base font-bold leading-tight">{campaign.title}</p>
          <p className="text-xs text-muted-foreground/60">{campaign.brand_name}</p>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-2 pt-1">
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
            Brinde por entrega: <span className="text-foreground">{campaign.physical_item}</span>
          </p>
        )}

        {/* Breakdown do orçamento (base + taxa + total) */}
        <div className="divide-y divide-border/30 pt-1">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">
              {campaign.slots} vagas × {fmt(campaign.reward_amount)}
            </span>
            <span className="text-sm font-semibold">{fmt(base)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">
              Taxa da plataforma ({PLATFORM_FEE_PCT}%)
            </span>
            <span className="text-sm font-semibold">{fmt(fee)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="font-semibold">Total a pagar</span>
          <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Forma de pagamento</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod("pix")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              paymentMethod === "pix"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30"
            )}
          >
            <QrCode className={cn("h-8 w-8", paymentMethod === "pix" ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">PIX</span>
            <span className="text-[11px] text-muted-foreground">Instantâneo</span>
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              paymentMethod === "card"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30"
            )}
          >
            <CreditCard className={cn("h-8 w-8", paymentMethod === "card" ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">Cartão</span>
            <span className="text-[11px] text-muted-foreground">Crédito/Débito</span>
          </button>
        </div>
      </div>

      {/* Badge de segurança */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success shrink-0" />
        <p className="text-xs">
          A verba fica reservada e só é liberada pro creator quando você aprova a entrega.
        </p>
      </div>

      {/* Pagar */}
      <Button
        className="w-full bg-gradient-primary border-0 rounded-xl h-12 text-base font-semibold"
        onClick={handlePay}
        disabled={processing || total <= 0}
      >
        {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
        {processing ? "Processando..." : `Pagar ${fmt(total)}`}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground/40">
        Sem campanha definida?{" "}
        <Link to="/discover" className="text-primary hover:underline">
          Volte e escolha uma
        </Link>
      </p>
    </div>
  );
}

// Mini-card de métrica do resumo (vagas / prazo / local).
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border/20 p-2.5 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-accent mb-1" />
      <p className="text-xs font-bold truncate">{value}</p>
      <span className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold">
        {label}
      </span>
    </div>
  );
}

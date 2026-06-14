import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QrCode, CreditCard, Loader2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  demo, demoId, computeBudget, PLATFORM_FEE_PCT,
  type Campaign,
} from "@/lib/campaigns";

interface Props {
  campaign: Campaign;            // campanha recém-criada (ainda não paga)
  onPaid: () => void;            // dispara markCampaignFunded + fecha o fluxo
  onBack?: () => void;           // volta pro form
}

type Method = "pix" | "card";

// Passo 2 do "Publicar e pagar": resumo do custo + método + botão Pagar.
export function CampaignPaymentStep({ campaign, onPaid, onBack }: Props) {
  const [method, setMethod] = useState<Method>("pix");
  const [paying, setPaying] = useState(false);

  const { base, fee, total } = computeBudget(campaign.slots, campaign.reward_amount);
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handlePay = async () => {
    setPaying(true);
    try {
      if (demo.isOn()) {
        const now = new Date().toISOString();
        // Demo: entra o dinheiro (topup) e sai o valor reservado pra campanha (hold).
        demo.addCredit({
          id: demoId("cr"),
          user_id: campaign.brand_id,
          kind: "topup",
          amount: total,
          campaign_id: campaign.id,
          status: "completed",
          provider: method === "pix" ? "pix" : "mercadopago",
          provider_ref: `demo-${method}`,
          created_at: now,
        });
        demo.addCredit({
          id: demoId("cr"),
          user_id: campaign.brand_id,
          kind: "campaign_hold",
          amount: -total, // reservado: sai do saldo
          campaign_id: campaign.id,
          status: "completed",
          provider: null,
          provider_ref: null,
          created_at: now,
        });
        await new Promise((r) => setTimeout(r, 700)); // simula confirmação
        onPaid();
        toast.success("Pagamento confirmado!", {
          description: `Sua campanha "${campaign.name}" está no ar.`,
        });
        return;
      }
      // TODO Mercado Pago: edge function fund-campaign — cria preferência (PIX/cartão),
      // ao confirmar webhook grava platform_credits (topup + campaign_hold) e funded=true.
      onPaid();
      toast.success("Pagamento iniciado", { description: "Confirme no provedor de pagamento." });
    } catch (e: any) {
      toast.error("Erro no pagamento", { description: e?.message });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Resumo do custo */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-primary/15 via-accent/5 to-background border border-primary/20">
        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-semibold">Total a pagar</p>
        <p className="text-3xl font-black mt-1">{fmt(total)}</p>
        <div className="mt-4 space-y-2 text-xs">
          <Row label={`${campaign.slots} influencers × ${fmt(campaign.reward_amount)}`} value={fmt(base)} />
          <Row label={`Taxa da plataforma (${PLATFORM_FEE_PCT}%)`} value={fmt(fee)} muted />
          <div className="h-px bg-border/30 my-1" />
          <Row label="Total" value={fmt(total)} bold />
        </div>
      </div>

      {/* Método de pagamento */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground/70">Como você quer pagar</p>
        <div className="grid grid-cols-2 gap-2">
          <MethodCard
            active={method === "pix"}
            onClick={() => setMethod("pix")}
            icon={<QrCode className="h-5 w-5" />}
            title="PIX"
            sub="Aprovação na hora"
          />
          <MethodCard
            active={method === "card"}
            onClick={() => setMethod("card")}
            icon={<CreditCard className="h-5 w-5" />}
            title="Cartão"
            sub="Crédito em até 12x"
          />
        </div>
      </div>

      {/* Visual do método escolhido */}
      {method === "pix" ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/20 bg-muted/10">
          <div className="h-16 w-16 rounded-xl bg-foreground/[0.04] border border-border/20 flex items-center justify-center shrink-0">
            <QrCode className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Ao tocar em <strong className="text-foreground">Pagar</strong>, geramos o QR Code PIX.
            O valor fica reservado até as entregas serem aprovadas.
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-border/20 bg-muted/10 space-y-2.5">
          <div className="h-9 rounded-lg bg-foreground/[0.04] border border-border/20 flex items-center px-3 text-[11px] text-muted-foreground/40">
            Número do cartão
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-9 rounded-lg bg-foreground/[0.04] border border-border/20 flex items-center px-3 text-[11px] text-muted-foreground/40">MM/AA</div>
            <div className="h-9 rounded-lg bg-foreground/[0.04] border border-border/20 flex items-center px-3 text-[11px] text-muted-foreground/40">CVV</div>
          </div>
        </div>
      )}

      {/* Selo de segurança */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
        <Lock className="h-3 w-3" /> Pagamento protegido · valor liberado só após a entrega
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        {onBack && (
          <Button variant="ghost" className="rounded-full" onClick={onBack} disabled={paying}>
            Voltar
          </Button>
        )}
        <Button
          className="flex-1 rounded-full bg-gradient-primary border-0 text-primary-foreground h-11 gap-1.5"
          onClick={handlePay}
          disabled={paying}
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {paying ? "Processando..." : `Pagar ${fmt(total)}`}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? "text-muted-foreground/50" : "text-muted-foreground/70", bold && "font-bold text-foreground")}>{label}</span>
      <span className={cn("font-semibold", bold ? "text-foreground" : "text-muted-foreground/80", muted && "text-muted-foreground/50")}>{value}</span>
    </div>
  );
}

function MethodCard({ active, onClick, icon, title, sub }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl border text-left transition-all flex flex-col gap-1",
        active
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
          : "border-border/20 bg-muted/10 hover:border-border/40"
      )}
    >
      <span className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground/50")}>{icon}</span>
      <span className="text-sm font-bold">{title}</span>
      <span className="text-[10px] text-muted-foreground/50">{sub}</span>
    </button>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { QrCode, CreditCard, Loader2, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { buildFundingRequest } from "@/lib/secureRequests";
import {
  demo, demoId, PLATFORM_FEE_PCT,
  type Campaign,
} from "@/lib/campaigns";

interface Props {
  campaign: Campaign;            // campanha recém-criada (ainda não paga)
  // realPayment=true → abriu o checkout REAL: NÃO marca funded aqui (o webhook do
  // Mercado Pago confirma o pagamento e coloca no ar). false → demo (marca funded).
  onPaid: (realPayment: boolean) => void;
  onBack?: () => void;           // volta pro form
}

type Method = "pix" | "card";

// Passo 2 do "Publicar e pagar": resumo do custo + método + botão Pagar.
export function CampaignPaymentStep({ campaign, onPaid, onBack }: Props) {
  const { user, session } = useAuth();
  const [method, setMethod] = useState<Method>("pix");
  const [paying, setPaying] = useState(false);

  // O total a pagar é o total_budget da campanha (já calculado certo pra paga ou permuta).
  const isPermuta = campaign.reward_type === "permuta";
  const isProcess = campaign.campaign_kind === "process";
  const total = campaign.total_budget;
  const base = isPermuta ? 0 : campaign.slots * campaign.reward_amount;
  const fee = total - base;
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Tenta o pagamento REAL via Mercado Pago (Checkout Pro). Abre a aba ANTES do
  // await pra não cair no bloqueador de pop-up. Retorna true se abriu o checkout.
  const openRealPayment = async (): Promise<boolean> => {
    const payTab = window.open("", "_blank");
    try {
      if (!session?.access_token) throw new Error("Faça login novamente para pagar.");
      const res = await fetch(
        "/api/fund-campaign",
        buildFundingRequest(campaign.id, session.access_token, crypto.randomUUID()),
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Não foi possível abrir o pagamento.");
      if (data?.init_point) {
        if (payTab) payTab.location.href = data.init_point;
        else window.location.href = data.init_point;
        return true;
      }
    } catch {
      /* sem provedor / offline — cai no demo */
    }
    if (payTab) payTab.close(); // não rolou pagamento real: fecha a aba em branco
    return false;
  };

  const handlePay = async () => {
    if (paying) return; // trava dupla submissão
    setPaying(true);
    try {
      // 1) Pagamento REAL (Mercado Pago) — abre o checkout de verdade numa aba.
      const realOpened = await openRealPayment();

      if (demo.isOn()) {
        const now = new Date().toISOString();
        // Saldo da carteira lê por user.id (auth) — o ledger do lojista TEM que usar user.id,
        // nunca brand_id, senão o dinheiro fica órfão e a Carteira não bate.
        const ownerId = user?.id ?? campaign.brand_id;
        // Demo: entra o dinheiro (topup) e sai o valor reservado pra campanha (hold).
        demo.addCredit({
          id: demoId("cr"),
          user_id: ownerId,
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
          user_id: ownerId,
          kind: "campaign_hold",
          amount: -total, // reservado: sai do saldo
          campaign_id: campaign.id,
          status: "completed",
          provider: null,
          provider_ref: null,
          created_at: now,
        });
        await new Promise((r) => setTimeout(r, 700));
        onPaid(false); // demo: marca funded (não há webhook)
        toast.success(realOpened ? "Pagamento aberto no Mercado Pago!" : "Campanha no ar!", {
          description: realOpened
            ? `Conclua o pagamento de ${fmt(total)} na aba do Mercado Pago — a campanha "${campaign.name}" já está no seu painel.`
            : `Sua campanha "${campaign.name}" está no ar.`,
        });
        return;
      }
      // Pagamento REAL: NÃO marca funded aqui. A campanha entra no ar SÓ quando o
      // webhook do Mercado Pago confirmar o pagamento de verdade (fica "aguardando
      // pagamento" no painel até lá).
      if (realOpened) {
        onPaid(true);
        toast.success("Pagamento aberto no Mercado Pago!", {
          description: `Conclua o pagamento de ${fmt(total)}. Assim que confirmar, sua campanha entra no ar automaticamente.`,
        });
      } else {
        toast.error("Pagamento indisponível agora", { description: "Tente de novo em instantes." });
      }
    } catch (e: any) {
      toast.error("Erro no pagamento", { description: e?.message });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Resumo do custo — card herói com double-bezel */}
      <div className="rounded-[1.75rem] bg-gradient-to-b from-accent/25 to-transparent p-px shadow-[0_24px_80px_-28px_hsl(174_100%_47%/0.35)]">
        <div className="rounded-[calc(1.75rem-1px)] bg-gradient-to-br from-primary/15 via-accent/[0.06] to-card/90 backdrop-blur-xl p-5 ring-1 ring-white/[0.05]">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-semibold">Total a pagar</p>
          <p className="text-4xl font-black mt-1 text-accent tabular-nums tracking-tight">{fmt(total)}</p>
          <div className="mt-4 space-y-2 text-xs">
            {isPermuta ? (
              <Row label={`${campaign.slots} vagas · taxa da plataforma`} value={fmt(total)} />
            ) : isProcess ? (
              <Row label={`${campaign.slots} vaga${campaign.slots !== 1 ? "s" : ""} × R$ 134 · pago por etapa`} value={fmt(total)} />
            ) : (
              <>
                <Row label={`${campaign.slots} influencers × ${fmt(campaign.reward_amount)}`} value={fmt(base)} />
                <Row label={`Taxa da plataforma (${PLATFORM_FEE_PCT}%)`} value={fmt(fee)} muted />
              </>
            )}
            <div className="h-px bg-border/40 my-1" />
            <Row label="Total" value={fmt(total)} bold />
          </div>
        </div>
      </div>

      {/* Método de pagamento */}
      <div className="space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/50">Como você quer pagar</p>
        <div className="grid grid-cols-2 gap-2.5">
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
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/20 bg-muted/10 animate-fade-in">
          <div className="h-16 w-16 rounded-xl bg-foreground/[0.04] border border-border/20 flex items-center justify-center shrink-0">
            <QrCode className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Ao tocar em <strong className="text-foreground">Pagar</strong>, você vai pro
            <strong className="text-foreground"> Mercado Pago</strong> pagar via PIX. O valor fica
            reservado até as entregas serem aprovadas.
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-border/20 bg-muted/10 space-y-2.5 animate-fade-in">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent/90">
            <ShieldCheck className="h-3 w-3" /> Pagamento seguro via Mercado Pago
          </div>
          <Input disabled placeholder="0000 0000 0000 0000" className="rounded-lg border-border/20 bg-foreground/[0.03] h-10 text-xs" />
          <div className="grid grid-cols-2 gap-2.5">
            <Input disabled placeholder="MM/AA" className="rounded-lg border-border/20 bg-foreground/[0.03] h-10 text-xs" />
            <Input disabled placeholder="CVV" className="rounded-lg border-border/20 bg-foreground/[0.03] h-10 text-xs" />
          </div>
          <p className="text-[10px] text-muted-foreground/40">Você preenche o cartão no ambiente seguro do Mercado Pago (em até 12x).</p>
        </div>
      )}

      {/* Selo de segurança */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
        <Lock className="h-3 w-3" /> Pagamento protegido · valor liberado só após a entrega
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        {onBack && (
          <Button variant="ghost" className="rounded-full h-12 gap-1.5 px-4" onClick={onBack} disabled={paying}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        )}
        <Button
          className="group flex-1 rounded-full bg-gradient-primary border-0 text-primary-foreground h-12 gap-2 active:scale-[.98] transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] shadow-[var(--shadow-glow-cta)] disabled:opacity-70 disabled:active:scale-100"
          onClick={handlePay}
          disabled={paying}
          aria-busy={paying}
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sr-only">Processando pagamento</span>
              Processando...
            </>
          ) : (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:scale-110">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              Pagar {fmt(total)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("min-w-0 truncate", muted ? "text-muted-foreground/50" : "text-muted-foreground/70", bold && "font-bold text-foreground")}>{label}</span>
      <span className={cn("font-semibold tabular-nums shrink-0", bold ? "text-foreground" : "text-muted-foreground/80", muted && "text-muted-foreground/50")}>{value}</span>
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
        "p-3.5 rounded-2xl border text-left transition-all duration-300 ease-[var(--ease-fluid)] flex flex-col gap-1 active:scale-[.98] min-h-[44px]",
        active
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30 shadow-[var(--shadow-glow-cta)]"
          : "border-border/20 bg-muted/10 hover:border-border/40 hover:-translate-y-0.5"
      )}
    >
      <span className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground/50")}>{icon}</span>
      <span className="text-sm font-bold">{title}</span>
      <span className="text-[10px] text-muted-foreground/50">{sub}</span>
    </button>
  );
}

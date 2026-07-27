import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { CampaignApplication, Campaign } from "@/lib/campaigns";

// Pagamento por SPLIT: a marca paga a vaga e o dinheiro cai DIRETO na conta
// Mercado Pago do creator, já com a taxa da OnlyShop descontada. Sem repasse.
//
// O bloco só aparece quando o split está ligado no servidor (sonda GET) — assim
// nada muda na tela enquanto as credenciais do MP não estiverem configuradas.
export function PayAffiliateCard({
  applications, campaigns,
}: { applications: CampaignApplication[]; campaigns: Campaign[] }) {
  const [on, setOn] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  // Vagas que já têm pagamento por split (pago ou em andamento). Como o status da
  // candidatura NÃO muda ao pagar (pagamento e entrega são separados no split),
  // é isso que tira o creator da lista de "a pagar".
  const [settled, setSettled] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    fetch("/api/pay-affiliate")
      .then((r) => r.json())
      .then((j) => { if (alive) setOn(j?.configured === true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!on) return;
    let alive = true;
    supabase
      .from("split_payments" as any)
      .select("application_id,status")
      .in("status", ["pending", "paid"])
      .then(({ data }) => {
        if (alive && data) setSettled(new Set((data as any[]).map((r) => r.application_id)));
      });
    return () => { alive = false; };
  }, [on, paying]);

  // Só campanhas SPLIT: em escrow a marca já pagou tudo na criação, então "Pagar"
  // não faz sentido (e o servidor recusaria com 409). Contratados ainda não pagos.
  const splitCampaignIds = new Set(campaigns.filter((c) => c.pay_mode === "split").map((c) => c.id));
  const pending = applications.filter(
    (a) => (a.status === "accepted" || a.status === "approved") && splitCampaignIds.has(a.campaign_id) && !settled.has(a.id)
  );
  if (!on || pending.length === 0) return null;

  const pay = async (a: CampaignApplication) => {
    setPaying(a.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/pay-affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ applicationId: a.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409 && j?.needsAffiliateMp) {
        toast.error("O creator ainda não conectou o Mercado Pago", { description: "Sem isso o dinheiro não tem pra onde ir. Peça pra ele conectar na Carteira." });
        return;
      }
      if (res.status === 409 && j?.already) {
        toast.info("Essa vaga já foi paga");
        setSettled((prev) => new Set(prev).add(a.id));
        return;
      }
      if (!res.ok || !j?.init_point) throw new Error(j?.error || "falha");
      window.location.href = j.init_point;
    } catch (e) {
      toast.error(e instanceof Error && e.message !== "falha" ? e.message : "Não foi possível abrir o pagamento");
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="rounded-[1.5rem] bg-gradient-to-b from-accent/[0.1] to-transparent p-px animate-slide-up">
      <div className="rounded-[calc(1.5rem-1px)] bg-card/80 ring-1 ring-inset ring-accent/10 p-4 space-y-2.5">
        <div>
          <p className="text-sm font-bold flex items-center gap-1.5"><Wallet className="h-4 w-4 text-accent" /> Pagar contratados</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">O dinheiro cai direto na conta do creator, já com a nossa taxa descontada.</p>
        </div>
        {pending.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent/25 to-primary/10 ring-1 ring-white/[0.06] grid place-items-center shrink-0 overflow-hidden">
              {a.influencer?.avatar_url
                ? <img src={a.influencer.avatar_url} alt="" className="h-full w-full object-cover" />
                : <span className="text-xs font-bold">{(a.influencer?.display_name || a.influencer?.username || "?")[0]?.toUpperCase()}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{a.influencer?.display_name || a.influencer?.username || "Creator"}</p>
              <p className="text-[10px] text-muted-foreground/55 truncate">{campaigns.find((c) => c.id === a.campaign_id)?.name ?? "Campanha"}</p>
            </div>
            <Button
              size="sm" onClick={() => pay(a)} disabled={paying === a.id}
              className="h-8 rounded-full px-3 text-xs bg-gradient-primary border-0 shrink-0 gap-1.5"
            >
              {paying === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Pagar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

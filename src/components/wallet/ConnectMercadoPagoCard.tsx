import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { splitLive } from "@/lib/splitMode";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// Conectar a conta Mercado Pago do afiliado (recebimento automático / split).
//
// HONESTIDADE DE ESTADO: enquanto o split não está "no ar" (live), as campanhas
// ainda pagam pelo modelo antigo — o afiliado saca via PIX aqui na Carteira. Se o
// card prometer "cai direto, sem espera" nesse momento, confunde (foi o que pegou
// o Biel: conectou, mas o saque pediu chave PIX). Então o texto muda conforme o
// estado real: "preparado" quando ainda não é automático, "ativo" quando é.
export function ConnectMercadoPagoCard({ delay = 0 }: { delay?: number }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const connected = profile?.mp_connected === true;

  useEffect(() => { splitLive().then(setLive).catch(() => {}); }, []);

  const connect = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/mp-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 503) {
        toast.info("Quase lá", { description: "A conexão com o Mercado Pago está sendo liberada. Em breve." });
        return;
      }
      if (!res.ok || !j?.url) throw new Error(j?.error || "falha");
      window.location.href = j.url; // vai pro Mercado Pago autorizar
    } catch {
      toast.error("Não foi possível abrir o Mercado Pago agora");
    } finally {
      setLoading(false);
    }
  };

  // Rótulo/descrição conforme (conectado?, automático já no ar?).
  const eyebrow = live ? "Receber automático" : "Recebimento automático · em ativação";
  const title = connected
    ? (live ? "Mercado Pago conectado" : "Mercado Pago conectado — quase lá")
    : "Conecte seu Mercado Pago";
  const desc = connected
    ? (live
        ? "Seu dinheiro cai direto na sua conta Mercado Pago, sem espera."
        : "Tudo pronto! Assim que o pagamento direto for ativado, cai automático na sua conta. Por enquanto, as campanhas ainda pagam pelo saque PIX aqui embaixo.")
    : (live
        ? "Conecte pra receber automático, direto na sua conta — sem esperar repasse."
        : "Conecte pra já deixar pronto o recebimento automático. Enquanto isso, os pagamentos saem pelo saque PIX abaixo.");

  return (
    <div className="animate-slide-up rounded-[1.5rem] border border-border/40 bg-gradient-to-b from-white/[0.05] to-transparent p-[1px]" style={{ animationDelay: `${delay}ms`, opacity: 0 }}>
      <div className="rounded-[1.4rem] bg-card/80 p-5 ring-1 ring-inset ring-white/[0.04] shadow-[var(--shadow-bezel-inset)]">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${connected ? "bg-accent/10 text-accent ring-accent/20" : "bg-primary/10 text-primary ring-primary/20"}`}>
            {connected ? <CheckCircle2 className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">{eyebrow}</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">{desc}</p>
          </div>
        </div>
        {!connected && (
          <Button onClick={connect} disabled={loading} className="mt-4 w-full h-11 rounded-xl gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Conectar Mercado Pago
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

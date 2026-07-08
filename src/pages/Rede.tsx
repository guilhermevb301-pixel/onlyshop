import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReferral } from "@/hooks/useReferral";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Network, Copy, Check, Share2, Users, Building2, BadgeDollarSign, Loader2, Sparkles, ArrowUpRight,
} from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Painel de rede (indicação) — o coração do motor de crescimento do 2.0.
// A pessoa compartilha o link, traz empresas/creators, e ganha 33% na 1ª compra
// de cada empresa + 5% recorrente. Aqui ela vê a rede e os ganhos.
export default function Rede() {
  const { user, loading: authLoading } = useAuth();
  const { link, network, companies, earnings, loading } = useReferral();
  const [copied, setCopied] = useState(false);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado!", { description: "Cola na sua bio e comece a crescer sua rede." });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignora */ }
  };
  const share = async () => {
    const data = { title: "OnlyShop", text: "Entra no OnlyShop pelo meu link 👇", url: link };
    try { if (navigator.share) await navigator.share(data); else copy(); } catch { /* ignora */ }
  };

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="h-10 w-10 rounded-2xl bg-gradient-primary ring-1 ring-white/10 flex items-center justify-center shrink-0 shadow-[var(--shadow-glow-cta)]">
          <Network className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">Minha rede</h1>
          <p className="text-xs text-muted-foreground/60 mt-1">Traga empresas e creators — ganhe por cada um.</p>
        </div>
      </div>

      {/* Link de indicação — herói */}
      <div className="rounded-[1.5rem] bg-gradient-to-b from-accent/20 to-transparent p-px shadow-[0_20px_60px_-24px_hsl(174_100%_47%/0.35)] animate-slide-up">
        <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-accent">Seu link — cola na bio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2.5 text-sm text-white/90 truncate font-mono">
              {link}
            </div>
            <Button onClick={copy} size="icon" className="h-11 w-11 rounded-xl bg-gradient-primary border-0 shrink-0 active:scale-95">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={share} variant="outline" className="w-full mt-2.5 rounded-xl h-11 gap-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]">
            <Share2 className="h-4 w-4" /> Compartilhar meu link
          </Button>
          <p className="text-[11px] text-muted-foreground/55 mt-3 leading-relaxed">
            Quem se cadastrar por esse link entra na sua rede. Cada empresa que você trouxer:
            <b className="text-white/80"> 33% na 1ª compra + 5% recorrente</b> pra sempre.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 animate-slide-up [animation-delay:60ms]">
        <Stat icon={<Users className="h-4 w-4 text-accent" />} value={network.length} label="na sua rede" />
        <Stat icon={<Building2 className="h-4 w-4 text-primary" />} value={companies} label="empresas" />
        <Stat icon={<BadgeDollarSign className="h-4 w-4 text-accent" />} value={brl(earnings)} label="ganhos" highlight />
      </div>

      {/* Lista da rede */}
      <div className="animate-slide-up [animation-delay:120ms]">
        <h2 className="text-sm font-semibold mb-3">Quem você trouxe</h2>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>
        ) : network.length === 0 ? (
          <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-3">
              <ArrowUpRight className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-bold">Sua rede começa agora</p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Compartilhe seu link com empresas e creators da sua região. Cada um vira renda recorrente pra você.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {network.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/10 ring-1 ring-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-white/90">{(m.display_name || m.username || "?")[0]?.toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{m.display_name || m.username || "Novo membro"}</p>
                  <p className="text-[11px] text-muted-foreground/60 truncate">{m.city || "—"}</p>
                </div>
                {m.is_brand && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 ring-1 ring-primary/20 rounded-full px-2 py-1">Empresa</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label, highlight }: { icon: React.ReactNode; value: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-3 text-center ring-1 ${highlight ? "bg-accent/[0.07] ring-accent/20" : "bg-white/[0.03] ring-white/[0.06]"}`}>
      <div className="flex items-center justify-center gap-1">{icon}
        <span className={`tabular-nums font-black ${highlight ? "text-base text-accent" : "text-lg text-foreground/90"}`}>{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}

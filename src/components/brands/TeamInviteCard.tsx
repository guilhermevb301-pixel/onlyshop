import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";

// Link de convite do time: a marca compartilha e o afiliado entra no time (join_team).
export function TeamInviteCard({ code }: { code?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const link = `${window.location.origin}/time/entrar/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Não foi possível copiar"); }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Entre no meu time no OnlyShop", url: link }); } catch { /* cancelado */ }
    } else { copy(); }
  };

  return (
    <div className="rounded-[1.5rem] bg-gradient-to-b from-white/[0.08] to-transparent p-px animate-slide-up">
      <div className="rounded-[calc(1.5rem-1px)] bg-card/80 ring-1 ring-inset ring-white/[0.04] p-4">
        <p className="text-sm font-semibold flex items-center gap-1.5"><UserPlus className="h-4 w-4 text-accent" /> Convidar afiliados</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1 leading-relaxed">
          Mande esse link pros seus afiliados (inclusive os que você já tem no TikTok). Quem entrar vira parte do seu time.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 min-w-0 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2.5 text-xs text-white/80 truncate font-mono">{link}</div>
          <Button onClick={copy} size="icon" className="h-10 w-10 rounded-xl bg-gradient-primary border-0 shrink-0 active:scale-95">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={share} variant="outline" className="w-full mt-2.5 rounded-xl h-10 gap-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm">
          <Share2 className="h-4 w-4" /> Compartilhar convite
        </Button>
      </div>
    </div>
  );
}

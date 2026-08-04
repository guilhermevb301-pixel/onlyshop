import { useState } from "react";
import { useTeamAnnouncements } from "@/hooks/useTeamAnnouncements";
import { HelpTip } from "@/components/ui/help-tip";
import { Megaphone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Comunicação central: a marca manda um aviso e ele chega a TODO o time de uma vez
// (afiliados ativos veem no feed deles). O "grupão" que o Biel pediu, sem sair do app.
export function TeamBroadcastCard({ brandId }: { brandId: string }) {
  const { items, loading, create } = useTeamAnnouncements(brandId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!body.trim() && !title.trim()) return;
    setSending(true);
    const ok = await create(title, body);
    setSending(false);
    if (ok) { setTitle(""); setBody(""); toast.success("Aviso enviado ao time"); }
    else toast.error("Não foi possível enviar");
  };

  return (
    <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
        <Megaphone className="h-3.5 w-3.5 text-primary" /> Avisar o time
        <HelpTip title="Avisar o time" body="Manda um recado, briefing ou material pra todos os afiliados ativos de uma vez. Eles veem no feed do app — sem precisar de grupo de WhatsApp." className="h-4 w-4" iconClassName="h-3 w-3" />
      </p>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional) — ex.: Campanha nova!"
        className="w-full h-10 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3 text-sm outline-none focus:ring-primary/30 placeholder:text-muted-foreground/35"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Escreva o recado, briefing ou link pro time…"
        className="w-full rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3 text-sm outline-none focus:ring-primary/30 placeholder:text-muted-foreground/35 resize-none"
      />
      <button
        onClick={send}
        disabled={sending || (!body.trim() && !title.trim())}
        className="w-full h-10 rounded-xl bg-gradient-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[.98] transition-transform"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar pro time
      </button>

      {!loading && items.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/40 font-semibold">Últimos avisos</p>
          {items.slice(0, 4).map((a) => (
            <div key={a.id} className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] p-3">
              {a.title && <p className="text-xs font-bold">{a.title}</p>}
              <p className="text-xs text-muted-foreground/75 leading-snug mt-0.5 whitespace-pre-wrap">{a.body}</p>
              <p className="text-[10px] text-muted-foreground/35 mt-1.5">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

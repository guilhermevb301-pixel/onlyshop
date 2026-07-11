import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRatings } from "@/hooks/useRatings";

interface Props {
  applicationId: string;
  ratedUserId: string;
  influencerName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}

const STEPS = [
  { key: "prazo", q: "Entregou no prazo?", hint: "Cumpriu o prazo combinado?" },
  { key: "qualidade", q: "Qualidade do vídeo?", hint: "O conteúdo ficou bom?" },
  { key: "briefing", q: "Seguiu o briefing?", hint: "Fez o que você pediu?" },
  { key: "comunicacao", q: "Comunicação?", hint: "Foi fácil de alinhar?" },
] as const;

// Avaliação guiada da marca -> influencer. 1 pergunta por tela (4 critérios em
// estrelas) + comentário. Grava 1 linha em ratings. Desacoplado do pagamento.
export function RateInfluencerSheet({ applicationId, ratedUserId, influencerName, open, onOpenChange, onDone }: Props) {
  const { submitRating } = useRatings();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const total = STEPS.length + 1; // 4 critérios + tela de comentário
  const isComment = step === STEPS.length;
  const current = STEPS[step];
  const canNext = isComment || (!!current && (scores[current.key] || 0) >= 1);

  const reset = () => { setStep(0); setScores({}); setComment(""); setBusy(false); };
  const close = (o: boolean) => { onOpenChange(o); if (!o) setTimeout(reset, 200); };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await submitRating({
      applicationId, ratedUserId,
      criteria: {
        prazo: scores.prazo || 3, qualidade: scores.qualidade || 3,
        briefing: scores.briefing || 3, comunicacao: scores.comunicacao || 3,
      },
      comment,
    });
    if (ok) {
      toast.success("Avaliação enviada!", { description: `Você avaliou ${influencerName || "o influencer"}.` });
      onDone?.();
      close(false);
    } else {
      toast.error("Não foi possível enviar a avaliação");
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" className="rounded-t-[1.75rem] max-h-[85vh]">
        <SheetHeader className="text-left">
          <SheetTitle>Avaliar {influencerName || "influencer"}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full bg-gradient-primary transition-all duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>

        <div className="py-6 min-h-[220px]">
          {isComment ? (
            <div className="space-y-3 animate-fade-in">
              <p className="text-lg font-bold">Quer deixar um comentário?</p>
              <p className="text-xs text-muted-foreground/60">Opcional — só pra registrar como foi a parceria.</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Ex: entregou rápido e o vídeo converteu bem..."
                className="rounded-xl border-border/30 resize-none"
              />
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in text-center">
              <div>
                <p className="text-xl font-bold">{current.q}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{current.hint}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = (scores[current.key] || 0) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScores((p) => ({ ...p, [current.key]: n }))}
                      className={cn(
                        "h-12 w-12 rounded-2xl grid place-items-center transition-all active:scale-90",
                        active ? "bg-warning/15 ring-1 ring-warning/30" : "bg-white/[0.04] ring-1 ring-white/[0.06]"
                      )}
                      aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                    >
                      <Star className={cn("h-6 w-6 transition-colors", active ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pb-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-full h-12 gap-1.5 border-border/40">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          )}
          {isComment ? (
            <Button onClick={finish} disabled={busy} className="flex-1 rounded-full h-12 gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Concluir avaliação
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => Math.min(total - 1, s + 1))} disabled={!canNext} className="flex-1 rounded-full h-12 gap-2 bg-gradient-primary border-0 text-white disabled:opacity-50 active:scale-[.98] transition-transform">
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

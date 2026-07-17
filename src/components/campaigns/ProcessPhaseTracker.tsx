import { useState } from "react";
import { CheckCircle2, Video, Radio, Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CampaignApplication, ProcessPhases } from "@/lib/campaigns";
import { PROCESS_PHASES_DEFAULT } from "@/lib/campaigns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// "Ganhe no Processo" (lado afiliado): as 3 fases, quanto já ganhou, e enviar
// comprovante de cada vídeo/live — que dispara o payout da etapa (server valida tudo).
export function ProcessPhaseTracker({ app, onSubmitProof }: {
  app: CampaignApplication;
  onSubmitProof: (appId: string, phase: "video" | "live", index: number, url: string) => Promise<boolean>;
}) {
  const raw = app.campaign?.phases as any;
  const phases = (raw && raw.connection ? raw : PROCESS_PHASES_DEFAULT) as ProcessPhases;
  const connPaid = !!app.connection_paid_at;
  const vids = app.videos_paid ?? 0;
  const lives = app.lives_paid ?? 0;
  const earned = (connPaid ? phases.connection.affiliate : 0) + vids * phases.video.amount + lives * phases.live.amount;
  const cap = phases.connection.affiliate + phases.video.amount * phases.video.max + phases.live.amount * phases.live.max;

  const [busy, setBusy] = useState<"video" | "live" | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const submit = async (phase: "video" | "live", index: number, url: string) => {
    if (!url.trim()) { toast.error("Cole o link do comprovante"); return; }
    setBusy(phase);
    const ok = await onSubmitProof(app.id, phase, index, url);
    setBusy(null);
    if (ok) {
      toast.success(`+${brl(phase === "video" ? phases.video.amount : phases.live.amount)} creditado!`, { description: "Já entra no seu saldo." });
      setVideoUrl(""); setLiveUrl("");
    } else {
      toast.error("Não foi possível creditar essa etapa agora");
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-primary/[0.1] to-transparent p-px">
      <div className="rounded-[calc(1rem-1px)] bg-card/80 ring-1 ring-inset ring-white/[0.05] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-1.5"><Coins className="h-4 w-4 text-accent" /> Ganhe no processo</p>
          <span className="text-sm font-black text-accent tabular-nums">{brl(earned)} <span className="text-[10px] text-muted-foreground/50 font-normal">de {brl(cap)}</span></span>
        </div>

        {/* Fase 1 — conexão */}
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className={cn("h-4 w-4 shrink-0", connPaid ? "text-accent" : "text-muted-foreground/25")} />
          <span className={connPaid ? "text-foreground" : "text-muted-foreground/60"}>
            Conexão {connPaid ? `· +${brl(phases.connection.affiliate)} ✓` : "(paga ao aceitar, quando a campanha está paga)"}
          </span>
        </div>

        {/* Fase 2 — vídeos */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground/85"><Video className="h-4 w-4 text-primary shrink-0" /> Vídeos <b>{vids}/{phases.video.max}</b> · +{brl(phases.video.amount)}/vídeo</div>
          {vids < phases.video.max && (
            <div className="flex gap-2">
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={`Link do vídeo ${vids + 1}`} className="h-9 rounded-lg text-xs border-border/30" />
              <Button onClick={() => submit("video", vids + 1, videoUrl)} disabled={busy !== null} size="sm" className="h-9 rounded-lg bg-gradient-primary border-0 shrink-0 px-3 text-xs">{busy === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar"}</Button>
            </div>
          )}
        </div>

        {/* Fase 3 — lives */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground/85"><Radio className="h-4 w-4 text-warning shrink-0" /> Lives <b>{lives}/{phases.live.max}</b> · +{brl(phases.live.amount)}/dia</div>
          {lives < phases.live.max && (
            <div className="flex gap-2">
              <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder={`Comprovante do dia ${lives + 1}`} className="h-9 rounded-lg text-xs border-border/30" />
              <Button onClick={() => submit("live", lives + 1, liveUrl)} disabled={busy !== null} size="sm" className="h-9 rounded-lg bg-gradient-primary border-0 shrink-0 px-3 text-xs">{busy === "live" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { getJourney, MILESTONES, journeyProgress, type Milestone } from "@/lib/journey";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Lock, ArrowRight, Route, Mic } from "lucide-react";

// O ritmo cíclico da live de vendas (áudio 3 dos sócios) — o "principal ensinamento".
const RITMO = [
  { n: 1, nome: "Chegada", desc: "\"Tô chegando, fica comigo\" — prende quem acabou de entrar." },
  { n: 2, nome: "Apresentação", desc: "Quem é você e o que vai mostrar — com autoridade." },
  { n: 3, nome: "Aquecimento", desc: "Vira papo caloroso: gera conexão e confiança." },
  { n: 4, nome: "Benefícios", desc: "Mostra o produto resolvendo a dor, ao vivo." },
  { n: 5, nome: "Fechamento", desc: "\"Corre no carrinho!\" — a hora da venda." },
];

// CTA de cada marco pendente — leva pra onde a ação acontece.
const CTA: Partial<Record<Milestone, { label: string; to: string }>> = {
  influencer_created: { label: "Criar influencer", to: "/meus-influencers" },
  video_generated: { label: "Gerar meu vídeo", to: "/studio" },
  video_published: { label: "Baixar e postar", to: "/studio" },
  first_live: { label: "Ver lives", to: "/live" },
};

export default function Jornada() {
  const journey = getJourney();
  const progress = journeyProgress();
  const firstPending = MILESTONES.find((m) => !journey[m.key]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
          <Route className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-primary tracking-wide uppercase">Carreira de OnlyShopper</p>
          <h1 className="text-lg font-bold leading-tight">Minha jornada</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Do zero à primeira venda. Cada passo te aproxima de viver disso — você não precisa aparecer.
      </p>

      {/* Progresso */}
      <div className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Progresso da jornada</span>
          <span className="text-xs font-display font-bold text-accent tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Trilha */}
      <div className="relative pl-2">
        {MILESTONES.map((m, i) => {
          const done = journey[m.key];
          const isCurrent = firstPending?.key === m.key;
          const cta = CTA[m.key];
          const last = i === MILESTONES.length - 1;
          return (
            <div key={m.key} className="relative flex gap-4 pb-7">
              {/* Linha conectora */}
              {!last && (
                <div className={cn(
                  "absolute left-[19px] top-10 bottom-0 w-[2px]",
                  done ? "bg-primary/40" : "bg-border"
                )} />
              )}
              {/* Nó */}
              <div className={cn(
                "relative z-10 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg transition-all",
                done ? "bg-gradient-primary text-white shadow-[var(--shadow-glow-cta)]"
                  : isCurrent ? "bg-card ring-2 ring-primary text-foreground"
                  : "bg-card ring-1 ring-border text-muted-foreground/40"
              )}>
                {done ? <Check className="h-5 w-5" /> : isCurrent ? <span>{m.emoji}</span> : <Lock className="h-4 w-4" />}
              </div>
              {/* Conteúdo */}
              <div className={cn("flex-1 pt-1", !done && !isCurrent && "opacity-50")}>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{m.label}</h3>
                  {done && <span className="text-[10px] font-medium text-accent">✓ concluído</span>}
                  {isCurrent && <span className="text-[10px] font-medium text-primary uppercase tracking-wide">próximo passo</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                {isCurrent && cta && (
                  <Button asChild size="sm" className="mt-2.5 h-8">
                    <Link to={cta.to}>{cta.label} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* O ritmo da venda — método da live (áudio 3) */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base lg:text-lg font-semibold">O ritmo da venda</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          O método que os maiores faturam na live — o mesmo ciclo que você treina aqui. Dura 4-5 min e sempre termina na venda.
        </p>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible">
          {RITMO.map((f, i) => (
            <div key={f.n} className="shrink-0 w-[160px] lg:w-auto rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 relative">
              <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-display font-bold text-sm mb-2.5">
                {f.n}
              </div>
              <p className="text-sm font-semibold">{f.nome}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{f.desc}</p>
              {i < RITMO.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {progress === 100 && (
        <div className="text-center py-6 mt-8 rounded-2xl bg-gradient-primary/10 ring-1 ring-primary/20">
          <p className="font-display font-bold text-lg">Você fechou a jornada! 👑</p>
          <p className="text-sm text-muted-foreground mt-1">Agora é escalar. Bora pra próxima venda.</p>
        </div>
      )}
    </div>
  );
}

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Video, Send, GraduationCap, Radio, Trophy, Sparkles } from "lucide-react";

// Recursos da fase 2+ (cortados do MVP enxuto, mostrados como "em breve").
const SOON = [
  { icon: Video, title: "Gerador de vídeo com IA", desc: "Crie o vídeo de venda com um influencer de IA — sem precisar gravar nem aparecer." },
  { icon: Send, title: "Postar direto no TikTok e Instagram", desc: "Publique a campanha direto do app, sem sair pra outro lugar." },
  { icon: GraduationCap, title: "Formação e cursos", desc: "Aprenda a gravar e vender melhor pra ganhar mais em cada campanha." },
  { icon: Radio, title: "Lives de venda", desc: "Venda ao vivo, igual as maiores lojas do TikTok Shop." },
  { icon: Trophy, title: "Ranking e conquistas", desc: "Suba de nível conforme fatura e desbloqueie campanhas melhores." },
];

export default function EmBreve() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Em breve no OnlyShop</h1>
          <p className="text-xs text-muted-foreground/60">O que tá chegando nas próximas fases. O foco agora é conectar marca e influencer perto de você.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {SOON.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="border-border/30 overflow-hidden relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-muted/30 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold leading-tight">{f.title}</p>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">Em breve</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 mt-1 leading-snug">{f.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-2xl bg-primary/5 ring-1 ring-primary/15 p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Esses recursos vêm depois que o coração do app — <strong>conectar marca e influencer por localização</strong> — estiver rodando redondo. Um passo de cada vez.
        </p>
      </div>
    </div>
  );
}

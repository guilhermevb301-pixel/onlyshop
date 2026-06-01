import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PERSONAS } from "@/lib/personas";
import { listInfluencers } from "@/lib/influencers";
import { nextMilestone, journeyProgress } from "@/lib/journey";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Wand2, Package, Compass, Users, Users2, Route, type LucideIcon } from "lucide-react";

// Prova social de faturamento (áudio 1: "ver quanto o pessoal já faturou").
const FEED_ATIVIDADE = [
  { nome: "Marina S.", acao: "faturou R$ 340 ontem", emoji: "💰" },
  { nome: "João P.", acao: "subiu pra Prata", emoji: "🥈" },
  { nome: "Bia R.", acao: "fez a 1ª venda hoje", emoji: "🎉" },
  { nome: "Lucas F.", acao: "gerou 12 vídeos esta semana", emoji: "🎬" },
  { nome: "Ana C.", acao: "bateu R$ 2.1k no mês", emoji: "🚀" },
  { nome: "Pedro H.", acao: "fechou 1ª live com venda", emoji: "🎙️" },
  { nome: "E você?", acao: "Seu nome aparece aqui quando você acertar 🔥", emoji: "✨" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

type Setor = { to: string; icon: LucideIcon; title: string; desc: string };

export default function Inicio() {
  const { user, profile } = useAuth();
  const [productCount, setProductCount] = useState<number | null>(null);
  const [personaCount, setPersonaCount] = useState(PERSONAS.length);

  const firstName = (profile?.display_name || user?.email?.split("@")[0] || "criador").split(" ")[0];
  const jProgress = journeyProgress();
  const next = nextMilestone();

  // Contagem de produtos (cabeçalho leve, sem trazer o catálogo todo pra home).
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("active", true);
      setProductCount(count ?? 0);
    })();
  }, []);

  // Contagem de influencers do usuário (+ os prontos).
  useEffect(() => {
    if (!user) return;
    listInfluencers(user.id).then((c) => setPersonaCount(PERSONAS.length + c.length)).catch(() => {});
  }, [user]);

  const setores: Setor[] = [
    { to: "/products", icon: Package, title: "Produtos", desc: `${productCount && productCount > 0 ? productCount : "Os"} mais vendidos pra anunciar` },
    { to: "/discover", icon: Compass, title: "Perto de você", desc: "Marcas e lojas no seu mapa" },
    { to: "/meus-influencers", icon: Users, title: "Meus influencers", desc: `${personaCount} prontos pra vender por você` },
    { to: "/comunidade", icon: Users2, title: "Comunidade", desc: "A tribo de quem fatura" },
  ];

  return (
    <div className="space-y-12 lg:space-y-16">
      {/* ===== Hero — a pergunta + ação ===== */}
      <section className="pt-2 lg:pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="inline-flex items-center rounded-full border border-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {greeting()}, {firstName}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
            ✦ OnlyShopper
          </span>
        </div>
        <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[0.98] max-w-3xl">
          Qual produto você quer <span className="text-gradient-primary">anunciar hoje?</span>
        </h1>
        <p className="text-muted-foreground text-base lg:text-lg max-w-xl mt-5">
          Escolha um produto, escolha um influencer de IA, e tenha um vídeo de venda pronto pro TikTok Shop, Instagram Shop ou sua loja. Você não precisa aparecer.
        </p>
        <Link
          to="/studio"
          className="group mt-7 inline-flex items-center gap-3 rounded-full pl-7 pr-2 py-3.5 bg-gradient-primary text-white font-semibold shadow-[var(--shadow-glow-cta)] transition-all duration-500 ease-[var(--ease-fluid)] active:scale-[0.98] hover:shadow-[0_12px_38px_-10px_hsl(346_100%_58%/0.6)]"
        >
          Criar meu vídeo agora
          <span className="grid place-items-center h-9 w-9 rounded-full bg-black/20 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* ===== Setores — cada um com ênfase, levando à sua página ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <h2 className="text-base lg:text-lg font-semibold mb-5">Por onde você quer começar?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {setores.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 lg:p-5 hover:ring-primary/30 hover:-translate-y-1 transition-all duration-300 ease-[var(--ease-fluid)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Sua jornada (carreira gamificada) ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <Link to="/jornada" className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 hover:ring-primary/30 transition-all">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
            <Route className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold">
                Sua jornada {jProgress > 0 && <span className="text-accent font-display">· {jProgress}%</span>}
              </p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            {next ? (
              <p className="text-xs text-muted-foreground">Próximo passo: <span className="text-foreground font-medium">{next.label}</span></p>
            ) : (
              <p className="text-xs text-accent">Jornada completa 👑 — bora escalar!</p>
            )}
            <Progress value={jProgress} className="h-1.5 mt-2" />
          </div>
        </Link>
      </section>

      {/* ===== Acontecendo agora (prova social de faturamento) ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <h2 className="text-base lg:text-lg font-semibold">Acontecendo agora no OnlyShop</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {FEED_ATIVIDADE.map((e, i) => (
            <div key={i} className="shrink-0 flex items-center gap-2.5 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] px-4 py-3">
              <span className="text-lg">{e.emoji}</span>
              <div>
                <p className="text-xs font-semibold leading-tight">{e.nome}</p>
                <p className="text-[11px] text-accent leading-tight">{e.acao}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

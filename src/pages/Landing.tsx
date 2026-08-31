import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Users, DollarSign, Star, Check, Sparkles, ChevronRight, Play,
  MapPin, Wallet, ShieldCheck, Video, Banknote, Clock, Store, Compass,
  Smartphone, Lock, Flame, Crown, X,
} from "lucide-react";
import { computeBudget, computeSplit, PLATFORM_FEE_PCT } from "@/lib/campaigns";
import logoImg from "@/assets/color-palette-ref.png";

/* Marca canônica (a constante APP_NAME ainda tem espaço; aqui cravamos o nome certo). */
const BRAND = "OnlyShop";

/* ─── Tokens locais (alinhados ao index.css dark: magenta = ação, cyan = dinheiro) ─── */
const MAGENTA = "hsl(346,100%,58%)";
const MAGENTA_SOFT = "hsl(330,81%,60%)";
const CYAN = "hsl(174,100%,47%)"; // cor do dinheiro

/* ─── Reveal on scroll (fade-up com ease custom, sem dependência externa) ─── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // respeita quem pediu menos movimento
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}

/* Wrapper de entrada fade-up escalonado */
function Reveal({
  children,
  delay = 0,
  className = "",
  as: As = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <As
      ref={ref as React.Ref<HTMLDivElement>}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </As>
  );
}

/* ─── Eyebrow tag ─── */
const Eyebrow = ({ children, color = MAGENTA }: { children: React.ReactNode; color?: string }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color }}>
    {children}
  </p>
);

/* ─── Card double-bezel (casca + núcleo squircle) ─── */
const Glass = ({
  children,
  className = "",
  glow = false,
  core = "bg-[#0b0b0d]",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  core?: string;
}) => (
  <div
    className={`relative rounded-[1.6rem] bg-gradient-to-b from-white/[0.10] to-white/[0.02] p-px ${
      glow ? "shadow-[var(--shadow-glow-cta)]" : ""
    } ${className}`}
  >
    <div
      className={`relative h-full rounded-[1.55rem] ${core} backdrop-blur-2xl overflow-hidden`}
      style={{ boxShadow: "var(--shadow-bezel-inset)" }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[1.55rem] bg-gradient-to-b from-white/[0.05] to-transparent" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  </div>
);

/* CTA com seta num círculo (padrão "ícone aninhado em círculo") */
const ArrowCircle = ({ light = false }: { light?: boolean }) => (
  <span
    aria-hidden="true"
    className={`ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 ${
      light ? "bg-black/15" : "bg-white/15"
    }`}
  >
    <ArrowRight className="h-3.5 w-3.5" />
  </span>
);

/* Avatar com iniciais (substitui fotos stock — honesto pra um produto novo) */
function InitialAvatar({
  name,
  className = "",
  ring = false,
}: {
  name: string;
  className?: string;
  ring?: boolean;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const hue = (name.charCodeAt(0) * 13 + (name.charCodeAt(1) || 0) * 7) % 360;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center font-bold text-white ${
        ring ? "ring-2 ring-[hsl(346,100%,58%)]/30" : ""
      } ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 60% 26%), hsl(${(hue + 40) % 360} 55% 16%))`,
      }}
    >
      {initials}
    </span>
  );
}

/* ─── Data (MVP "Conecta localizado") ─── */
const stats = [
  { value: "Sorocaba/SP", label: "Primeira praça", icon: MapPin, money: false },
  { value: "100%", label: "Do prêmio é seu", icon: Wallet, money: true },
  { value: "PIX", label: "Saque na hora", icon: Banknote, money: true },
  { value: "Grátis", label: "Pra creator", icon: Sparkles, money: false },
];

/* 3 pilares reais */
const pillars = [
  {
    icon: Compass,
    title: "Mapa por geolocalização",
    desc: "Abra o mapa e veja as marcas e lojas perto de você que estão pagando por vídeo. Raio em km, do seu bairro.",
    accent: MAGENTA,
  },
  {
    icon: ShieldCheck,
    title: "Pague só por entrega aprovada",
    desc: "Lojista trava o valor da vaga; o creator só recebe quando o vídeo é aprovado. Sem caô, sem trabalho de graça.",
    accent: CYAN,
  },
  {
    icon: Wallet,
    title: "Split 80/20 com saque PIX",
    desc: "Você recebe 100% do prêmio. A taxa de 20% é cobrada da marca por cima. Aprovou, sacou no PIX.",
    accent: MAGENTA_SOFT,
  },
];

const steps = [
  { n: "01", title: "Crie sua conta grátis", desc: "Menos de 1 minuto. Sem cartão.", icon: Smartphone },
  { n: "02", title: "Abra o mapa", desc: "Veja as campanhas pagando perto de você.", icon: MapPin },
  { n: "03", title: "Pegue uma vaga", desc: "Aceite a campanha e grave um vídeo simples.", icon: Video },
  { n: "04", title: "Envie e receba", desc: "Manda o link, é aprovado, cai no PIX.", icon: DollarSign },
];

const faqs = [
  { q: "Preciso ter muitos seguidores?", a: "Não. As campanhas são por entrega de vídeo, não por número de seguidores. Se você grava um vídeo honesto do produto, você pode pegar a vaga." },
  { q: "Quanto custa pra usar?", a: "Pro creator é grátis, você só ganha. O lojista paga o prêmio das vagas que abrir + 20% de taxa da plataforma. Sem mensalidade pra ninguém." },
  { q: "Como recebo o dinheiro?", a: "Quando a marca aprova seu vídeo, o valor cai no seu saldo. Você saca via PIX direto pela carteira do app." },
  { q: "Qual o split?", a: "Você (creator) recebe 100% do prêmio anunciado. A marca paga mais 20% de taxa para a OnlyShop, sem desconto no seu ganho." },
  { q: "Funciona na minha cidade?", a: "Estamos começando por Sorocaba/SP e expandindo praça por praça. Crie sua conta e o mapa já mostra o que tem perto de você." },
  { q: "E se eu sou lojista?", a: "Você abre uma campanha, define o prêmio por vídeo e quantas vagas quer. Só paga pelas entregas aprovadas. Quem não entrega, não custa." },
  { q: "Funciona no celular?", a: "Sim. O app roda no navegador e instala como app nativo (PWA) direto no seu celular." },
];

const beforeAfter = [
  { before: "Procurar marca no direct e nunca ter resposta", after: "Abrir o mapa e ver quem está pagando agora" },
  { before: "Gravar publi de graça torcendo por retorno", after: "Pegar uma vaga com prêmio definido antes" },
  { before: "Depender de ter milhares de seguidores", after: "Ganhar por entrega, não por audiência" },
  { before: "Esperar pra ver se vão te pagar", after: "Aprovou o vídeo, sacou no PIX" },
];

const audience = [
  { icon: Video, title: "Creators e gente da cidade", desc: "Grava um vídeo simples do produto, entrega e recebe. Sem precisar ser influencer." },
  { icon: Store, title: "Lojas e marcas locais", desc: "Abre campanha, define o prêmio por vídeo e só paga pelas entregas aprovadas." },
  { icon: MapPin, title: "Qualquer um perto de uma vaga", desc: "O match é por localização: se tem campanha no seu raio, ela aparece no seu mapa." },
];

const testimonials = [
  { name: "Marina Sales", role: "Creator · Moda", text: "Peguei uma campanha de vestido a 2 km de casa, gravei no domingo e o PIX caiu na terça. Surreal de simples." },
  { name: "Pedro Henrique", role: "Creator · Fitness", text: "Não tenho seguidor nenhum e mesmo assim faturei gravando resenha de whey. Aqui paga por entrega, não por audiência." },
  { name: "GlowLab", role: "Loja de cosméticos", text: "Abri a campanha do sérum e em dois dias tinha gente da cidade gravando. Só paguei pelos vídeos que aprovei." },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Entrega aprovada antes de pagar" },
  { icon: Lock, label: "Saldo travado pelo lojista" },
  { icon: Banknote, label: "Saque via PIX" },
  { icon: Smartphone, label: "App nativo (PWA)" },
];

export default function Landing() {
  /* nav sticky com estado de scroll */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* calculadora do split (dados reais via campaigns.ts) */
  const [slots, setSlots] = useState(10);
  const [reward, setReward] = useState(50);
  const budget = computeBudget(slots, reward);
  const split = computeSplit(reward);
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden">
      {/* ── Ambiente magenta ↔ cyan (a dualidade da marca) ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.08] blur-[150px]" style={{ background: MAGENTA }} />
        <div className="absolute top-[35%] right-[-15%] w-[50vw] h-[50vw] rounded-full opacity-[0.05] blur-[160px]" style={{ background: CYAN }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full opacity-[0.05] blur-[130px]" style={{ background: MAGENTA_SOFT }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* ═══ NAV (sticky) ═══ */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          scrolled ? "border-b border-white/[0.06] bg-black/70 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${BRAND} — início`}>
            <img src={logoImg} alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-extrabold text-sm tracking-tight">{BRAND}</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-xs text-white/45">
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-white transition-colors" aria-label="Ir para Como funciona">Como funciona</button>
            <button onClick={() => scrollTo("pillars")} className="hover:text-white transition-colors" aria-label="Ir para Como funciona o dinheiro">O dinheiro</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-white transition-colors" aria-label="Ir para Preço">Preço</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-white transition-colors" aria-label="Ir para Perguntas frequentes">FAQ</button>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-white/45 hover:text-white hover:bg-white/5 text-xs h-9 rounded-full px-4">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-primary text-white text-xs h-9 px-5 rounded-full font-semibold border-0 shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 pt-10 sm:pt-16 pb-20 overflow-hidden">
        <div className="pointer-events-none absolute top-[-10%] left-[5%] w-[55vw] h-[55vw] max-w-[640px] max-h-[640px] rounded-full opacity-[0.10] blur-[140px]" style={{ background: MAGENTA }} />
        <div className="pointer-events-none absolute top-[25%] right-[8%] w-[36vw] h-[36vw] max-w-[440px] max-h-[440px] rounded-full opacity-[0.07] blur-[150px]" style={{ background: CYAN }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-5 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* ── Coluna texto ── */}
            <Reveal className="max-w-2xl mx-auto text-center lg:text-left lg:mx-0">
              <Badge className="mb-6 bg-white/[0.06] backdrop-blur-xl text-white/65 border-white/[0.08] text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-[0.18em] inline-flex">
                <MapPin className="h-3 w-3 mr-1.5" style={{ color: CYAN }} />
                Conecta localizado · pague por entrega
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-[4.2rem] font-extrabold mb-6 leading-[0.98] tracking-tight">
                Marcas e lojas{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(270,91%,65%)]">perto de você</span>{" "}
                procurando quem grave vídeo.{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(174,100%,47%)] to-[hsl(174,100%,60%)]">Ganhe por entrega</span>
              </h1>

              <p className="text-base sm:text-lg text-white/60 mb-8 max-w-md leading-relaxed mx-auto lg:mx-0">
                Abra o mapa, pegue uma campanha da sua região, grave um vídeo simples e receba via PIX. Sem precisar de seguidor.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 justify-center lg:justify-start">
                <Button asChild size="lg" className="group bg-gradient-primary text-white w-full sm:w-auto text-sm h-14 px-7 rounded-full font-bold border-0 shadow-[var(--shadow-glow-cta)] hover:-translate-y-0.5 active:scale-[.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <Link to="/auth">
                    Criar conta grátis
                    <ArrowCircle />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full sm:w-auto text-white/55 hover:text-white hover:bg-white/5 h-14 px-7 rounded-full text-sm active:scale-[.98] transition-transform"
                  onClick={() => scrollTo("how-it-works")}
                >
                  <Play className="mr-2 h-3.5 w-3.5" />
                  Como funciona
                </Button>
              </div>

              {/* Mini social proof honesto */}
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {testimonials.map((t) => (
                    <InitialAvatar key={t.name} name={t.name} className="h-7 w-7 rounded-full border-2 border-black text-[9px]" />
                  ))}
                </div>
                <div className="text-[11px] text-white/45">
                  Primeiras lojas e creators de <span className="text-white/75 font-semibold">Sorocaba</span>
                </div>
              </div>
            </Reveal>

            {/* ── Coluna mockup (campanha no mapa) ── */}
            <Reveal delay={120} className="flex justify-center mt-2 lg:mt-0">
              <div className="relative">
                <div className="absolute inset-0 -m-6 rounded-[48px] opacity-30 blur-2xl" style={{ background: `linear-gradient(135deg, ${MAGENTA}, ${CYAN})` }} />
                {/* phone frame */}
                <div className="relative w-[272px] rounded-[40px] border border-white/10 bg-[#050506] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]">
                  <div className="rounded-[30px] overflow-hidden bg-[#0a0a0c]">
                    {/* header do app */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-gradient-primary flex items-center justify-center">
                          <Compass className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="text-white text-xs font-bold">Perto de você</div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-white/60">
                        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: CYAN }} /> ao vivo
                      </div>
                    </div>
                    {/* mini mapa */}
                    <div className="px-4">
                      <div className="relative aspect-[9/13] rounded-2xl overflow-hidden bg-[#0e0e12]">
                        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06), transparent 60%), repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 28px)" }} />
                        {/* user pin */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <span className="absolute inset-0 m-auto h-10 w-10 rounded-full animate-ping opacity-40" style={{ background: MAGENTA }} />
                          <span className="relative block h-3 w-3 rounded-full ring-4 ring-black" style={{ background: MAGENTA }} />
                        </div>
                        {/* campaign pins (R$) */}
                        {[
                          { t: "30%", l: "22%", v: "R$50" },
                          { t: "62%", l: "70%", v: "R$60" },
                          { t: "76%", l: "30%", v: "R$45" },
                        ].map((p) => (
                          <div key={p.v} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold text-black shadow-lg" style={{ top: p.t, left: p.l, background: CYAN }}>
                            {p.v}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* campanha selecionada */}
                    <div className="px-4 py-3">
                      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                        <div className="flex items-center gap-2">
                          <InitialAvatar name="Boutique Bella" className="h-9 w-9 rounded-lg text-[10px] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-white text-[11px] font-semibold truncate">Vestidos da nova coleção</div>
                            <div className="text-white/40 text-[10px]">Boutique Bella · 1,8 km</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-extrabold tabular-nums" style={{ color: CYAN }}>R$ 40</div>
                            <div className="text-[8px] text-white/30">você recebe</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-16">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 70}>
                <div className="rounded-[1.3rem] p-px bg-gradient-to-br from-white/10 to-transparent transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 h-full">
                  <div className="rounded-[1.25rem] bg-[#0a0a0c] p-4 sm:p-5 text-center h-full" style={{ boxShadow: "var(--shadow-bezel-inset)" }}>
                    <stat.icon className="h-4 w-4 mx-auto mb-2" style={{ color: stat.money ? CYAN : MAGENTA }} />
                    <div className="text-lg sm:text-2xl font-bold tabular-nums" style={stat.money ? { color: CYAN } : undefined}>{stat.value}</div>
                    <div className="text-[10px] text-white/35 mt-0.5">{stat.label}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section className="py-4 border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="flex items-center justify-center gap-6 sm:gap-12 flex-wrap text-[11px] text-white/45">
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" style={{ color: MAGENTA }} /><span className="font-bold text-white/75">Sorocaba/SP</span> primeira praça</div>
            <div className="flex items-center gap-1.5"><Wallet className="h-3 w-3" style={{ color: CYAN }} /><span className="font-bold" style={{ color: CYAN }}>100%</span> do prêmio pro creator</div>
            <div className="flex items-center gap-1.5"><Banknote className="h-3 w-3" style={{ color: CYAN }} /><span className="font-bold text-white/75">PIX</span> na aprovação</div>
            <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-white/35" /><span className="font-bold text-white/75">&lt;1min</span> cadastro</div>
          </div>
        </div>
      </section>

      {/* ═══ 3 PILARES (o que é único) ═══ */}
      <section id="pillars" className="py-16 sm:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-12">
            <Eyebrow color={CYAN}>Como o dinheiro funciona</Eyebrow>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Sem enrolação:{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(174,100%,47%)]">vaga, vídeo, PIX</span>
            </h2>
            <p className="mt-3 text-sm text-white/55 max-w-xl mx-auto">
              Um marketplace de campanhas localizadas. A loja paga pela entrega aprovada, você recebe 100% do prêmio e saca no PIX.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 90} className="h-full">
                <Glass className="h-full">
                  <div className="p-6">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4 border border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${p.accent}26, transparent)` }}>
                      <p.icon className="h-6 w-6" style={{ color: p.accent }} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">{p.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{p.desc}</p>
                  </div>
                </Glass>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120} className="mt-8 text-center">
            <Button asChild size="sm" className="group rounded-full bg-gradient-primary text-white text-xs h-11 px-6 font-semibold border-0 shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform">
              <Link to="/mapa">Ver o mapa de campanhas <ArrowCircle /></Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ═══ PARA QUEM ═══ */}
      <section className="py-16 sm:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-12">
            <Eyebrow>Para quem é</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Os dois lados do{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(270,91%,65%)]">mesmo mapa</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {audience.map((item, i) => (
              <Reveal key={item.title} delay={i * 80} className="h-full">
                <Glass className="h-full" core="bg-[#0a0a0c]">
                  <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${MAGENTA}1f, transparent)` }}>
                      <item.icon className="h-5 w-5" style={{ color: MAGENTA }} />
                    </div>
                    <h3 className="font-bold text-sm mb-2 text-white">{item.title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                </Glass>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-16 sm:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-14">
            <Eyebrow>Como funciona</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Quatro passos para{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(174,100%,47%)]">receber por vídeo</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 80} className="relative text-center">
                <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white/[0.08] to-transparent mb-1 select-none" aria-hidden="true">{s.n}</div>
                <Glass>
                  <div className="p-5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${i === 3 ? CYAN : MAGENTA}26, transparent)` }}>
                      <s.icon className="h-5 w-5" style={{ color: i === 3 ? CYAN : MAGENTA }} />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                    <p className="text-[11px] text-white/40 leading-relaxed">{s.desc}</p>
                  </div>
                </Glass>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEFORE / AFTER ═══ */}
      <section className="py-16 sm:py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-12">
            <Eyebrow>Antes vs Depois</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              O que muda com a{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(174,100%,47%)]">{BRAND}</span>
            </h2>
          </Reveal>

          <div className="space-y-3">
            {beforeAfter.map((item, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <X className="h-4 w-4 text-white/30 mx-auto mb-1.5" />
                    <p className="text-xs text-white/40 leading-relaxed">{item.before}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0" style={{ color: MAGENTA }} aria-hidden="true" />
                  <div className="p-4 rounded-2xl border text-center" style={{ background: `${CYAN}10`, borderColor: `${CYAN}26` }}>
                    <Check className="h-4 w-4 mx-auto mb-1.5" style={{ color: CYAN }} />
                    <p className="text-xs text-white/75 leading-relaxed font-medium">{item.after}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-16 sm:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-12">
            <Eyebrow>Os primeiros</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Quem já está{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(270,91%,65%)]">no mapa</span>
            </h2>
            <p className="text-xs text-white/40 mt-3 max-w-md mx-auto">Histórias das primeiras campanhas em Sorocaba.</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 80} className="h-full">
                <Glass className="h-full">
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-0.5 mb-3">
                      {[...Array(5)].map((_, j) => <Star key={j} className="h-3 w-3 text-amber-400 fill-amber-400" aria-hidden="true" />)}
                    </div>
                    <p className="text-xs text-white/55 leading-relaxed flex-1 mb-4">"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                      <InitialAvatar name={t.name} ring className="h-9 w-9 rounded-full text-[11px]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold">{t.name}</div>
                        <div className="text-[10px] text-white/35">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </Glass>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST BADGES ═══ */}
      <section className="py-12 sm:py-16 relative z-10 border-y border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-8">
            <h3 className="text-lg sm:text-xl font-bold">Dinheiro só sai quando o vídeo é aprovado</h3>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {trustBadges.map((b, i) => (
              <Reveal key={b.label} delay={i * 60}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <b.icon className="h-5 w-5" style={{ color: i % 2 === 0 ? MAGENTA : CYAN }} />
                  </div>
                  <span className="text-[10px] text-white/40 font-medium leading-tight">{b.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PREÇO (modelo real, sem planos SaaS) ═══ */}
      <section id="pricing" className="py-16 sm:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-12">
            <Eyebrow color={CYAN}>Preço</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Grátis pra creator.{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(174,100%,47%)] to-[hsl(174,100%,62%)]">Lojista paga por entrega.</span>
            </h2>
            <p className="text-xs text-white/40 mt-3 max-w-lg mx-auto">Sem mensalidade pra ninguém. O lojista paga o prêmio das vagas + {PLATFORM_FEE_PCT}% da OnlyShop. O creator recebe 100% do prêmio anunciado.</p>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-4 items-stretch">
            {/* Creator */}
            <Reveal className="h-full">
              <Glass className="h-full">
                <div className="p-6 sm:p-8 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Video className="h-4 w-4" style={{ color: MAGENTA }} />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-bold">Creator</span>
                  </div>
                  <div className="flex items-end gap-1 my-3">
                    <span className="text-4xl font-extrabold">Grátis</span>
                    <span className="text-xs text-white/35 mb-1.5">pra sempre</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {["Ver o mapa de campanhas perto de você", "Aceitar vagas sem precisar de seguidor", "Receber 100% do prêmio de cada vídeo", "Sacar via PIX quando o vídeo é aprovado"].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: CYAN }} />
                        <span className="text-white/60">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="group w-full rounded-full h-12 text-sm font-semibold bg-gradient-primary text-white border-0 shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform">
                    <Link to="/auth">Começar a ganhar <ArrowCircle /></Link>
                  </Button>
                </div>
              </Glass>
            </Reveal>

            {/* Lojista — com calculadora real */}
            <Reveal delay={100} className="h-full">
              <Glass glow className="h-full">
                <div className="p-6 sm:p-8 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="h-4 w-4" style={{ color: CYAN }} />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-bold">Lojista</span>
                  </div>
                  <div className="flex items-end gap-1.5 my-3">
                    <span className="text-4xl font-extrabold">Por entrega</span>
                  </div>
                  <p className="text-xs text-white/45 mb-5">Você define o prêmio por vídeo e quantas vagas quer. Só paga pelas entregas aprovadas. Quem não entrega, não custa.</p>

                  {/* Calculadora (computeBudget/computeSplit reais) */}
                  <div className="rounded-2xl bg-black/40 border border-white/[0.06] p-4 mb-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-white/50 mb-1.5">
                        <span>Vagas</span>
                        <span className="font-bold text-white tabular-nums">{slots}</span>
                      </div>
                      <input type="range" min={1} max={50} value={slots} onChange={(e) => setSlots(Number(e.target.value))} aria-label="Número de vagas" className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[hsl(346,100%,58%)] bg-white/10" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-white/50 mb-1.5">
                        <span>Prêmio por vídeo</span>
                        <span className="font-bold tabular-nums" style={{ color: CYAN }}>{fmt(reward)}</span>
                      </div>
                      <input type="range" min={20} max={300} step={5} value={reward} onChange={(e) => setReward(Number(e.target.value))} aria-label="Prêmio por vídeo" className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[hsl(174,100%,47%)] bg-white/10" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/35">Você paga</div>
                        <div className="text-sm font-extrabold tabular-nums" style={{ color: CYAN }}>{fmt(budget.total)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/35">Taxa {PLATFORM_FEE_PCT}%</div>
                        <div className="text-sm font-bold text-white/70 tabular-nums">{fmt(budget.fee)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/35">Creator/vídeo</div>
                        <div className="text-sm font-bold text-white/70 tabular-nums">{fmt(split.influencer)}</div>
                      </div>
                    </div>
                  </div>

                  <Button asChild className="group w-full rounded-full h-12 text-sm font-semibold bg-white/[0.06] backdrop-blur border border-white/[0.1] text-white hover:bg-white/[0.1] active:scale-[.98] transition-all">
                    <Link to="/auth">Criar minha campanha <ArrowCircle /></Link>
                  </Button>
                </div>
              </Glass>
            </Reveal>
          </div>

          <Reveal delay={120} className="mt-6 text-center">
            <p className="text-[11px] text-white/30">TikTok Shop, Instagram Shop e vídeo gerado por IA estão no roadmap. <Link to="/em-breve" className="underline underline-offset-2 hover:text-white/60 transition-colors">Ver o que vem por aí</Link>.</p>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-16 sm:py-24 relative z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-5">
          <Reveal className="text-center mb-12">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
            <p className="text-xs text-white/40 mt-3">Tire suas dúvidas antes de começar.</p>
          </Reveal>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 40}>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                  <details className="group">
                    <summary className="flex items-center justify-between text-sm font-medium px-5 py-4 list-none text-white/70 hover:text-white transition-colors cursor-pointer">
                      {faq.q}
                      <ChevronRight className="h-3.5 w-3.5 text-white/25 transition-transform group-open:rotate-90 shrink-0 ml-3" aria-hidden="true" />
                    </summary>
                    <div className="px-5 pb-4">
                      <p className="text-xs text-white/40 leading-relaxed">{faq.a}</p>
                    </div>
                  </details>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ URGENCY ═══ */}
      <section className="py-10 relative z-10 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-4 sm:px-5">
          <Reveal>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-bold">Sorocaba está abrindo as primeiras campanhas</p>
                  <p className="text-[11px] text-white/40">Crie sua conta e seja um dos primeiros do mapa da sua cidade.</p>
                </div>
              </div>
              <Button asChild size="sm" className="group bg-gradient-primary text-white rounded-full h-11 px-6 text-xs font-bold border-0 shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform shrink-0">
                <Link to="/auth">Entrar no mapa <ArrowCircle /></Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-5 text-center">
          <Reveal>
            <Glass glow>
              <div className="p-10 sm:p-14">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 shadow-[var(--shadow-glow-cta)]">
                  <Crown className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                  Pronto para{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(346,100%,58%)] to-[hsl(174,100%,47%)]">ganhar por vídeo?</span>
                </h2>
                <p className="text-sm text-white/45 mb-8 max-w-md mx-auto">
                  Entra. Aqui ninguém grava de graça.
                </p>
                <Button asChild size="lg" className="group bg-gradient-primary text-white rounded-full h-14 px-9 text-sm font-bold border-0 shadow-[var(--shadow-glow-cta)] hover:-translate-y-0.5 active:scale-[.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <Link to="/auth">Criar conta grátis<ArrowCircle /></Link>
                </Button>
                <p className="text-[10px] text-white/20 mt-5">Sem cartão · Sem mensalidade · Saque via PIX</p>

                <div className="flex items-center justify-center gap-2 mt-6">
                  <div className="flex -space-x-1.5">
                    {testimonials.map((t) => (
                      <InitialAvatar key={t.name} name={t.name} className="h-6 w-6 rounded-full border border-white/10 text-[8px]" />
                    ))}
                  </div>
                  <span className="text-[10px] text-white/25">Primeiros creators de Sorocaba</span>
                </div>
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 border-t border-white/[0.05] relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImg} alt="" className="h-7 w-7 rounded-lg object-cover" />
                <span className="font-bold text-xs">{BRAND}</span>
              </div>
              <p className="text-[10px] text-white/25 leading-relaxed">Marketplace de campanhas localizadas. Pague por entrega, ganhe por vídeo.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/45 uppercase tracking-widest mb-3">Produto</p>
              <div className="space-y-2">
                <button onClick={() => scrollTo("pillars")} className="block text-[11px] text-white/30 hover:text-white transition-colors" aria-label="Ir para Como o dinheiro funciona">Como funciona</button>
                <button onClick={() => scrollTo("pricing")} className="block text-[11px] text-white/30 hover:text-white transition-colors" aria-label="Ir para Preço">Preço</button>
                <button onClick={() => scrollTo("faq")} className="block text-[11px] text-white/30 hover:text-white transition-colors" aria-label="Ir para FAQ">FAQ</button>
                <Link to="/mapa" className="block text-[11px] text-white/30 hover:text-white transition-colors">Ver o mapa</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/45 uppercase tracking-widest mb-3">Legal</p>
              <div className="space-y-2">
                <Link to="/terms" className="block text-[11px] text-white/30 hover:text-white transition-colors">Termos de Uso</Link>
                <Link to="/privacy" className="block text-[11px] text-white/30 hover:text-white transition-colors">Privacidade</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/45 uppercase tracking-widest mb-3">Comunidade</p>
              <div className="space-y-2">
                <Link to="/auth" className="block text-[11px] text-white/30 hover:text-white transition-colors">Criar conta</Link>
                <Link to="/auth" className="block text-[11px] text-white/30 hover:text-white transition-colors">Entrar</Link>
                <Link to="/em-breve" className="block text-[11px] font-bold hover:opacity-80 transition-opacity" style={{ color: MAGENTA }}>O que vem por aí</Link>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-white/20">© 2026 {BRAND}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4 text-[11px] text-white/20">
              <span>🇧🇷 Feito no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Users, TrendingUp, DollarSign, Shield, Star, Check,
  Sparkles, ChevronRight, Play, BarChart3, Globe, MessageCircle, Heart,
  Clock, Rocket, Zap, Award, Target, Eye, X, ShieldCheck, Smartphone,
  Headphones, Lock, CreditCard, RefreshCw, Gift, Crown, Flame, Instagram,
  Youtube, Twitter
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import logoImg from "@/assets/color-palette-ref.png";

/* ─── Data ─── */
const stats = [
  { value: "10K+", label: "Criadores ativos", icon: Users },
  { value: "R$1M+", label: "Comissões pagas", icon: DollarSign },
  { value: "4.9★", label: "Avaliação", icon: Star },
  { value: "500+", label: "Marcas parceiras", icon: Target },
];

const features = [
  { icon: Globe, title: "Rede Social Integrada", desc: "Feed, stories, comunidades e chat em um só lugar." },
  { icon: TrendingUp, title: "Sistema de Afiliados", desc: "Links rastreáveis com dashboard em tempo real." },
  { icon: DollarSign, title: "Monetização Real", desc: "Comissões automáticas depositadas na sua conta." },
  { icon: Shield, title: "Segurança Total", desc: "Dados criptografados e tracking transparente." },
  { icon: BarChart3, title: "Analytics Avançado", desc: "CTR, conversões, ROI e métricas completas." },
  { icon: MessageCircle, title: "Comunidade Ativa", desc: "Networking com os top criadores do Brasil." },
];

const testimonials = [
  { name: "Marina Sales", role: "Top Afiliada · 3 meses", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face", text: "Em 3 meses fui de zero a R$12.400/mês em comissões. A plataforma mudou minha vida financeira.", earnings: "R$87.5K" },
  { name: "Pedro Henrique", role: "Creator · 6 meses", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", text: "O tracking transparente mudou completamente meu jogo. Sei exatamente de onde vem cada centavo.", earnings: "R$45.2K" },
  { name: "Rafa Digital", role: "Influencer · 1 ano", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", text: "Meu CTR subiu de 2% pra 8% com a prova social verificada. Resultados reais e mensuráveis.", earnings: "R$120K" },
  { name: "Beatriz Nova", role: "Iniciante · 1 mês", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", text: "Primeiro mês e já fiz R$2.100! A comunidade ajuda demais. Recomendo pra qualquer iniciante.", earnings: "R$2.1K" },
  { name: "Lucas Ferreira", role: "Agência · 8 meses", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", text: "Gerencio 15 afiliados pela plataforma. O dashboard B2B é incomparável no mercado.", earnings: "R$230K" },
  { name: "Ana Clara", role: "Creator · 4 meses", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", text: "Saí do CLT pra viver de conteúdo. Hoje faturo 3x mais e tenho liberdade total.", earnings: "R$56K" },
];

const plans = [
  { name: "Free", price: "R$0", period: "para sempre", desc: "Explore a plataforma", features: ["Perfil público", "Feed social completo", "Comunidades ilimitadas", "Ranking de criadores"], highlight: false, cta: "Começar grátis" },
  { name: "Starter", price: "R$65,90", period: "/mês", desc: "Aprenda a monetizar", features: ["Tudo do Free", "Treinamento gamificado", "Missões com recompensas", "Suporte prioritário"], highlight: false, cta: "Começar agora" },
  { name: "Partner", price: "R$699", period: "/mês", desc: "Monetize de verdade", features: ["Tudo do Starter", "Links de afiliado ilimitados", "Painel de vendas completo", "Comissão turbinada", "Kit físico exclusivo"], highlight: true, cta: "Quero monetizar" },
  { name: "Business", price: "R$998", period: "/mês", desc: "Escale seu negócio", features: ["Tudo do Partner", "Criar rede de afiliados", "Relatórios B2B", "API de integração"], highlight: false, cta: "Escalar negócio" },
];

const steps = [
  { n: "01", title: "Crie sua conta", desc: "Cadastro em menos de 1 minuto.", icon: Rocket },
  { n: "02", title: "Monte seu perfil", desc: "Conecte suas redes sociais.", icon: Users },
  { n: "03", title: "Poste e engaje", desc: "Crie conteúdo e construa audiência.", icon: Heart },
  { n: "04", title: "Monetize", desc: "Ative links e gere receita por post.", icon: DollarSign },
];

const faqs = [
  { q: "Preciso pagar para começar?", a: "Não! O plano Free é gratuito para sempre. Você pode explorar toda a rede social sem pagar nada." },
  { q: "Como funciona o sistema de afiliados?", a: "Faça upgrade para o plano Partner e receba links rastreáveis. Cada venda gera comissão automática depositada na sua conta." },
  { q: "Quanto tempo leva para ter resultado?", a: "Alguns membros reportam ganhos na primeira semana. A maioria atinge resultados consistentes em 30-60 dias." },
  { q: "Funciona em qualquer dispositivo?", a: "Sim! Navegador, celular, tablet. Também instala como app nativo (PWA) direto no seu celular." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem burocracia. Cancele pelo painel em dois cliques. Sem multa, sem pegadinha." },
  { q: "É seguro colocar meus dados?", a: "Totalmente. Usamos criptografia de ponta e nunca compartilhamos seus dados com terceiros." },
  { q: "Qual a diferença pro Instagram/TikTok?", a: "Aqui você monetiza diretamente. Cada post tem potencial de gerar comissão via links de afiliado integrados." },
];

const beforeAfter = [
  { before: "Postar sem retorno financeiro", after: "Cada post gera comissão rastreável" },
  { before: "Não saber de onde vem as vendas", after: "Dashboard com analytics em tempo real" },
  { before: "Depender de publi de marcas", after: "Monetização própria e automática" },
  { before: "Trabalhar sozinho sem suporte", after: "Comunidade ativa com top creators" },
  { before: "Links genéricos sem tracking", after: "Links personalizados com CTR otimizado" },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Dados criptografados" },
  { icon: Lock, label: "Pagamentos seguros" },
  { icon: CreditCard, label: "Checkout protegido" },
  { icon: Headphones, label: "Suporte 24/7" },
  { icon: RefreshCw, label: "Garantia 7 dias" },
  { icon: Smartphone, label: "App nativo (PWA)" },
];

/* ─── Reusable glass card ─── */
const Glass = ({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) => (
  <div className={`relative rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl ${glow ? "shadow-[0_0_60px_-15px_hsl(330,81%,60%,0.25)]" : ""} ${className}`}>
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[hsl(240,12%,3%)] text-white overflow-x-hidden">
      {/* ── Mesh background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[hsl(330,81%,60%)] opacity-[0.07] blur-[150px]" />
        <div className="absolute top-[30%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-[hsl(270,91%,65%)] opacity-[0.05] blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-[hsl(25,95%,53%)] opacity-[0.05] blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="relative z-50 w-full">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt={APP_NAME} className="h-10 w-10 rounded-xl object-cover" />
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-xs text-white/40">
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Como funciona</button>
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Recursos</button>
            <button onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Planos</button>
            <button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/5 text-xs h-9 rounded-full px-4">
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] hover:bg-white/[0.14] text-white text-xs h-9 px-5 rounded-full font-semibold shadow-[0_0_20px_hsl(330,81%,60%,0.15)]">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 pt-8 sm:pt-16 pb-20 overflow-hidden">
        {/* glow atrás do título */}
        <div className="pointer-events-none absolute top-[-10%] left-[5%] w-[55vw] h-[55vw] max-w-[640px] max-h-[640px] rounded-full bg-[hsl(330,81%,60%)] opacity-[0.10] blur-[140px]" />
        <div className="pointer-events-none absolute top-[20%] left-[30%] w-[40vw] h-[40vw] max-w-[480px] max-h-[480px] rounded-full bg-[hsl(270,91%,65%)] opacity-[0.08] blur-[150px]" />

        <div className="max-w-6xl mx-auto px-5 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* ── Coluna texto ── */}
            <div className="max-w-2xl mx-auto text-center lg:text-left lg:mx-0">
              <Badge className="mb-6 bg-white/[0.06] backdrop-blur-xl text-white/60 border-white/[0.08] text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-[0.15em] inline-flex">
                <Sparkles className="h-3 w-3 mr-1.5 text-[hsl(25,95%,53%)]" />
                O ecossistema de vendas do Brasil
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 leading-[0.95] tracking-tight">
                Conecta{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(25,95%,53%)] via-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]">marcas e afiliados</span>
                <br />
                em{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]">renda real</span>
              </h1>

              <p className="text-base sm:text-lg text-white/55 mb-8 max-w-md leading-relaxed mx-auto lg:mx-0">
                Marcas e lojas acham quem vende seus produtos. Afiliados acham renda — no TikTok Shop, Instagram Shop e em lojas físicas perto de você. E a IA cria o vídeo: você nem precisa aparecer.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 justify-center lg:justify-start">
                <Button asChild size="lg" className="bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] hover:opacity-90 hover:-translate-y-0.5 transition-transform text-white w-full sm:w-auto text-sm h-13 px-8 rounded-full font-bold border-0 shadow-[0_8px_40px_-8px_hsl(330,81%,60%,0.5)]">
                  <Link to="/auth">
                    Começar grátis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full sm:w-auto text-white/40 hover:text-white hover:bg-white/5 h-13 px-8 rounded-full text-sm"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Play className="mr-2 h-3.5 w-3.5" />
                  Como funciona
                </Button>
              </div>

              {/* Mini social proof under CTA */}
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {testimonials.slice(0, 4).map((t) => (
                    <img key={t.name} src={t.avatar} alt="" className="h-7 w-7 rounded-full border-2 border-[hsl(240,12%,3%)] object-cover" />
                  ))}
                </div>
                <div className="text-[11px] text-white/40">
                  <span className="text-white/70 font-semibold">+10.000</span> criadores ativos
                </div>
              </div>
            </div>

            {/* ── Coluna mockup (Estúdio IA) ── */}
            <div className="flex justify-center mt-2 lg:mt-0">
              <div className="relative">
                {/* halo */}
                <div className="absolute inset-0 -m-6 rounded-[48px] bg-gradient-to-tr from-[hsl(330,81%,60%)]/20 to-[hsl(270,91%,65%)]/20 blur-2xl" />
                {/* phone frame */}
                <div className="relative w-[270px] rounded-[40px] border border-white/10 bg-[hsl(240,10%,5%)] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                  <div className="rounded-[30px] overflow-hidden bg-[hsl(240,10%,7%)]">
                    {/* header do app */}
                    <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                      <div className="h-7 w-7 rounded-xl bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] flex items-center justify-center text-white text-sm">🪄</div>
                      <div className="text-white text-xs font-bold">Estúdio IA</div>
                    </div>
                    {/* vídeo gerado */}
                    <div className="px-4">
                      <div className="relative aspect-[9/16] rounded-2xl overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=700&fit=crop&crop=faces" alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">Cena 2/3</div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="text-white text-[11px] font-semibold leading-tight mb-1">"Esse sérum mudou minha pele em 2 semanas"</div>
                          <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                            <div className="h-full w-2/3 bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* produto + status */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <div className="h-9 w-9 rounded-lg bg-white/5 overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=120" alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white text-[11px] font-medium truncate">Sérum Vitamina C Glow</div>
                        <div className="text-[hsl(330,81%,65%)] text-[10px]">gerando vídeo de venda…</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-16">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-[1px] bg-gradient-to-br from-white/10 to-transparent transition-transform hover:-translate-y-1"
              >
                <div className="rounded-2xl bg-[hsl(240,10%,6%)] p-4 sm:p-5 text-center h-full">
                  <stat.icon className="h-4 w-4 mx-auto mb-2 text-[hsl(330,81%,60%)]" />
                  <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section className="py-4 border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-center gap-6 sm:gap-12 flex-wrap text-[11px] text-white/40">
            <div className="flex items-center gap-1.5"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /><span className="font-bold text-white/70">4.9/5</span> avaliação</div>
            <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-[hsl(330,81%,60%)]" /><span className="font-bold text-white/70">10K+</span> criadores</div>
            <div className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-400" /><span className="font-bold text-white/70">R$1M+</span> pagos</div>
            <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-white/30" /><span className="font-bold text-white/70">&lt;1min</span> cadastro</div>
          </div>
        </div>
      </section>

      {/* ═══ NOVIDADES — features lançadas hoje ═══ */}
      <section className="py-16 sm:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-[hsl(346,100%,58%)]/10 text-[hsl(346,100%,68%)] border-[hsl(346,100%,58%)]/30 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wider uppercase">
              <Sparkles className="h-3 w-3 mr-1 inline" /> Novo · Recém-lançado
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-3">
              Inteligência que <span className="text-gradient-primary">conecta sozinha</span>
            </h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              Pare de procurar marcas ou afiliados. A Only Shop faz o match automaticamente baseado em nicho, performance e localização.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Sparkles, title: "Smart Match", desc: "IA cruza nicho + geo + performance e devolve top matches.", href: "/discover", color: "from-[hsl(346,100%,58%)] to-[hsl(330,81%,60%)]" },
              { icon: Flame, title: "Em Alta", desc: "Produtos hypados ranqueados por vendas reais das últimas 24h-30d.", href: "/trending", color: "from-[hsl(25,95%,53%)] to-[hsl(346,100%,58%)]" },
              { icon: Globe, title: "Geolocalização", desc: "Encontre criadores e marcas próximos para entregas e parcerias locais.", href: "/discover", color: "from-[hsl(174,100%,47%)] to-[hsl(200,100%,55%)]" },
              { icon: MessageCircle, title: "Convites Diretos", desc: "Marcas convidam afiliados em 1 clique. Inbox dedicada para responder.", href: "/invites", color: "from-[hsl(270,91%,65%)] to-[hsl(346,100%,58%)]" },
            ].map((f) => (
              <Link key={f.title} to={f.href} className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all hover:scale-[1.02]">
                <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{f.desc}</p>
                <ChevronRight className="absolute top-5 right-5 h-4 w-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button asChild size="sm" className="rounded-full bg-white text-black hover:bg-white/90 text-xs h-9 px-5">
              <Link to="/discover">Testar Smart Match agora <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ PARA QUEM ═══ (light) */}
      <section className="py-20 sm:py-28 relative z-10 bg-white text-[hsl(240,10%,4%)]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Para quem é</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[hsl(240,10%,4%)]">
              Feito para quem quer <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(25,95%,53%)] to-[hsl(330,81%,60%)]">crescer</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Heart, title: "Criadores de Conteúdo", desc: "Monetize seus posts com links de afiliado rastreáveis. Cada conteúdo vira uma fonte de receita." },
              { icon: Award, title: "Afiliados Profissionais", desc: "Painel completo de vendas, comissões automáticas e ferramentas profissionais de tracking." },
              { icon: Target, title: "Marcas & Agências", desc: "Acesse os top criadores do Brasil e escale suas vendas com social commerce." },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-3xl border border-[hsl(240,6%,90%)] bg-[hsl(240,5%,97%)] group hover:border-[hsl(330,81%,60%,0.3)] hover:shadow-[0_8px_30px_-10px_hsl(330,81%,60%,0.12)] transition-all duration-500">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(330,81%,60%,0.12)] to-[hsl(270,91%,65%,0.06)] border border-[hsl(330,81%,60%,0.1)] flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-[hsl(330,81%,60%)]" />
                </div>
                <h3 className="font-bold text-sm mb-2 text-[hsl(240,10%,4%)]">{item.title}</h3>
                <p className="text-xs text-[hsl(240,4%,46%)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ (dark) */}
      <section id="how-it-works" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Como funciona</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Quatro passos para <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]">começar a lucrar</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s) => (
              <div key={s.n} className="relative text-center group">
                <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white/[0.06] to-transparent mb-1 select-none">{s.n}</div>
                <Glass className="p-5 mx-auto group-hover:border-[hsl(330,81%,60%,0.3)] transition-all duration-500">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[hsl(330,81%,60%,0.15)] to-transparent border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <s.icon className="h-5 w-5 text-[hsl(330,81%,60%)]" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                  <p className="text-[11px] text-white/30 leading-relaxed">{s.desc}</p>
                </Glass>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEFORE/AFTER ═══ (dark) */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Antes vs Depois</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              O que muda com o <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(25,95%,53%)] to-[hsl(330,81%,60%)]">{APP_NAME}</span>
            </h2>
          </div>

          <div className="space-y-3">
            {beforeAfter.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                <div className="p-4 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.1] text-center">
                  <X className="h-4 w-4 text-red-400 mx-auto mb-1.5" />
                  <p className="text-xs text-white/40 leading-relaxed">{item.before}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[hsl(330,81%,60%)] shrink-0" />
                <div className="p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/[0.1] text-center">
                  <Check className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs text-white/70 leading-relaxed font-medium">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ (dark) */}
      <section id="features" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Recursos</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Tudo para <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(25,95%,53%)] via-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]">crescer e monetizar</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Glass key={f.title} className="p-5 group hover:border-[hsl(330,81%,60%,0.3)] transition-all duration-500">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(330,81%,60%,0.15)] to-transparent border border-white/[0.06] flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-[hsl(330,81%,60%)] group-hover:text-[hsl(25,95%,53%)] transition-colors" />
                </div>
                <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RESULTS BANNER ═══ (dark) */}
      <section className="py-16 relative z-10">
        <div className="max-w-4xl mx-auto px-5">
          <Glass glow className="p-8 sm:p-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(330,81%,60%,0.08)] via-transparent to-[hsl(270,91%,65%,0.08)] pointer-events-none" />
            <div className="grid grid-cols-3 gap-4 text-center relative z-10">
              {[
                { v: "R$12.400", l: "Maior ganho mensal", icon: DollarSign },
                { v: "8.2%", l: "CTR médio top creators", icon: Eye },
                { v: "145K", l: "Views em um único post", icon: Zap },
              ].map((s) => (
                <div key={s.l}>
                  <s.icon className="h-5 w-5 mx-auto mb-2 text-[hsl(330,81%,60%)]" />
                  <div className="text-xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">{s.v}</div>
                  <p className="text-[10px] sm:text-xs text-white/35 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </Glass>
        </div>
      </section>

      {/* ═══ INTEGRATIONS / PLATFORMS ═══ (dark) */}
      <section className="py-16 sm:py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Integrações</p>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight mb-4">
            Funciona com as redes que você já usa
          </h2>
          <p className="text-xs text-white/35 mb-10 max-w-md mx-auto">Conecte suas redes sociais e centralize tudo em um único painel de controle.</p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {[
              { icon: Instagram, name: "Instagram", color: "from-pink-500 to-purple-500" },
              { icon: Youtube, name: "YouTube", color: "from-red-500 to-red-600" },
              { icon: Twitter, name: "X / Twitter", color: "from-gray-700 to-gray-900" },
              { icon: Globe, name: "TikTok", color: "from-cyan-400 to-pink-500" },
            ].map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-2 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <p.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[10px] text-white/40 font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ (dark) */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Depoimentos</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Resultados <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]">reais</span>
            </h2>
            <p className="text-xs text-white/30 mt-3 max-w-md mx-auto">Veja o que nossos membros estão dizendo sobre a plataforma.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <Glass key={t.name} className="p-5 flex flex-col">
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-xs text-white/45 leading-relaxed flex-1 mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                  <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-[hsl(330,81%,60%,0.3)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">{t.name}</div>
                    <div className="text-[10px] text-white/30">{t.role}</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 backdrop-blur px-2.5 py-1 rounded-full">{t.earnings}</span>
                </div>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST BADGES ═══ (dark) */}
      <section className="py-14 sm:py-16 relative z-10 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <h3 className="text-lg sm:text-xl font-bold">Sua segurança é prioridade</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {trustBadges.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-2 text-center">
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-[hsl(330,81%,60%)]" />
                </div>
                <span className="text-[9px] text-white/30 font-medium leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ (dark) */}
      <section id="plans" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">Planos</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Escolha seu <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(25,95%,53%)] to-[hsl(330,81%,60%)]">plano</span>
            </h2>
            <p className="text-xs text-white/30 mt-3 max-w-md mx-auto">Comece grátis e faça upgrade quando quiser. Sem compromisso.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <Glass key={plan.name} glow={plan.highlight} className={`p-5 flex flex-col transition-all duration-500 ${plan.highlight ? "border-[hsl(330,81%,60%,0.3)] scale-[1.02]" : "hover:border-white/[0.12]"}`}>
                {plan.highlight && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] text-white border-0 text-[9px] font-bold px-3 rounded-full shadow-[0_4px_20px_hsl(330,81%,60%,0.3)]">
                    🔥 Popular
                  </Badge>
                )}
                <h3 className="font-bold text-sm">{plan.name}</h3>
                <p className="text-[10px] text-white/30 mt-0.5">{plan.desc}</p>
                <div className="my-4">
                  <span className="text-2xl font-extrabold">{plan.price}</span>
                  <span className="text-xs ml-1 text-white/25">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 shrink-0 text-[hsl(330,81%,60%)]" />
                      <span className="text-white/45">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm" className={`w-full rounded-full h-10 text-xs font-semibold ${
                  plan.highlight
                    ? "bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] text-white hover:opacity-90 border-0 shadow-[0_4px_20px_hsl(330,81%,60%,0.3)]"
                    : "bg-white/[0.06] backdrop-blur border border-white/[0.08] text-white hover:bg-white/[0.1]"
                }`}>
                  <Link to="/auth">{plan.cta}<ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </Glass>
            ))}
          </div>

          {/* Enterprise */}
          <div className="mt-8 max-w-2xl mx-auto">
            <Glass className="p-6 sm:p-8 text-center">
              <Badge className="bg-white/[0.06] backdrop-blur text-white/50 border-white/[0.06] text-[9px] mb-3 rounded-full">Enterprise</Badge>
              <h3 className="text-base font-bold mb-1">Plano PRO para Marcas</h3>
              <p className="text-xs text-white/30 mb-5">USD $9.999 + 3% · Setup completo e suporte dedicado.</p>
              <Button asChild size="sm" className="rounded-full text-xs h-10 px-6 bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] hover:opacity-90 text-white border-0 font-semibold shadow-[0_4px_20px_hsl(330,81%,60%,0.3)]">
                <Link to="/auth">Falar com time comercial</Link>
              </Button>
            </Glass>
          </div>
        </div>
      </section>

      {/* ═══ GUARANTEE ═══ (light) */}
      <section className="py-16 sm:py-20 relative z-10 bg-white text-[hsl(240,10%,4%)]">
        <div className="max-w-3xl mx-auto px-5">
          <div className="p-8 sm:p-10 rounded-3xl border border-[hsl(160,40%,88%)] bg-[hsl(160,50%,97%)] text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-[0_8px_30px_-8px_hsl(160,84%,39%,0.4)]">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[hsl(240,10%,4%)] mb-3">Garantia de 7 dias</h3>
            <p className="text-sm text-[hsl(240,4%,46%)] leading-relaxed max-w-lg mx-auto mb-4">
              Experimente qualquer plano pago por 7 dias. Se não ficar satisfeito, devolvemos 100% do seu investimento. Sem perguntas, sem burocracia.
            </p>
            <div className="flex items-center justify-center gap-4 text-[11px] text-[hsl(240,4%,46%)]">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" />Sem multa</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" />Sem pegadinha</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" />Reembolso total</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ (dark) */}
      <section id="faq" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold text-[hsl(330,81%,60%)] uppercase tracking-[0.2em] mb-3">FAQ</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
            <p className="text-xs text-white/30 mt-3">Tire suas dúvidas antes de começar.</p>
          </div>
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between text-sm font-medium px-5 py-4 list-none text-white/70 hover:text-white transition-colors cursor-pointer">
                    {faq.q}
                    <ChevronRight className="h-3.5 w-3.5 text-white/25 transition-transform group-open:rotate-90 shrink-0 ml-3" />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-xs text-white/35 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ URGENCY BANNER ═══ (dark) */}
      <section className="py-10 relative z-10 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(330,81%,60%)] flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Vagas limitadas para o plano Partner</p>
                <p className="text-[11px] text-white/35">Apenas 50 vagas disponíveis por mês. Garanta a sua.</p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-gradient-to-r from-[hsl(25,95%,53%)] to-[hsl(330,81%,60%)] text-white hover:opacity-90 rounded-full h-10 px-6 text-xs font-bold border-0 shadow-[0_4px_20px_hsl(25,95%,53%,0.3)] shrink-0">
              <Link to="/auth">
                Garantir vaga
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ (dark) */}
      <section className="py-24 sm:py-32 relative z-10">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <Glass glow className="p-10 sm:p-14">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_-8px_hsl(330,81%,60%,0.4)]">
              <Crown className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Pronto para{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(25,95%,53%)] via-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)]">começar?</span>
            </h2>
            <p className="text-sm text-white/30 mb-8 max-w-md mx-auto">
              Junte-se a milhares de criadores que já monetizam seu conteúdo todos os dias.
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-[hsl(330,81%,60%)] to-[hsl(270,91%,65%)] hover:opacity-90 text-white rounded-full h-13 px-10 text-sm font-bold border-0 shadow-[0_8px_40px_-8px_hsl(330,81%,60%,0.5)]">
              <Link to="/auth">Criar conta grátis<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <p className="text-[10px] text-white/15 mt-5">Sem cartão · Cancele quando quiser · Suporte em português</p>

            {/* Mini avatars */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="flex -space-x-1.5">
                {testimonials.slice(0, 5).map((t) => (
                  <img key={t.name} src={t.avatar} alt="" className="h-6 w-6 rounded-full border border-white/10 object-cover" />
                ))}
              </div>
              <span className="text-[10px] text-white/25">+10K criadores ativos</span>
            </div>
          </Glass>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 border-t border-white/[0.05] relative z-10">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImg} alt={APP_NAME} className="h-7 w-7 rounded-lg object-cover" />
                <span className="font-bold text-xs">{APP_NAME}</span>
              </div>
              <p className="text-[10px] text-white/20 leading-relaxed">A rede social de monetização #1 do Brasil.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Produto</p>
              <div className="space-y-2">
                <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="block text-[11px] text-white/25 hover:text-white transition-colors">Recursos</button>
                <button onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })} className="block text-[11px] text-white/25 hover:text-white transition-colors">Planos</button>
                <button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })} className="block text-[11px] text-white/25 hover:text-white transition-colors">FAQ</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Legal</p>
              <div className="space-y-2">
                <Link to="/terms" className="block text-[11px] text-white/25 hover:text-white transition-colors">Termos de Uso</Link>
                <Link to="/privacy" className="block text-[11px] text-white/25 hover:text-white transition-colors">Privacidade</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Comunidade</p>
              <div className="space-y-2">
                <Link to="/auth" className="block text-[11px] text-white/25 hover:text-white transition-colors">Criar conta</Link>
                <Link to="/auth" className="block text-[11px] text-white/25 hover:text-white transition-colors">Login</Link>
                <Link to="/vsl" className="block text-[11px] text-[hsl(330,81%,60%)] font-bold hover:opacity-80 transition-opacity">Apresentação VSL</Link>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-white/15">© 2026 {APP_NAME}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4 text-[11px] text-white/20">
              <span>🇧🇷 Feito no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

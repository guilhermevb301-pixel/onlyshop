import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText, Shield, Users, CreditCard, Handshake, FileText, AlertTriangle, XCircle, Scale, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import logoImg from "@/assets/color-palette-ref.png";

const sections = [
  {
    icon: ScrollText,
    title: "1. Aceitação dos Termos",
    content: `Ao acessar ou utilizar a plataforma ${APP_NAME}, você concorda integralmente com estes Termos de Uso. Caso não concorde, interrompa o uso imediatamente.`,
  },
  {
    icon: FileText,
    title: "2. Descrição do Serviço",
    content: `A ${APP_NAME} é uma plataforma de social commerce que combina comunidade, sistema de afiliados e monetização de conteúdo. Oferecemos funcionalidades como perfil público, feed, comunidades, ranking, links de afiliado e integração com redes sociais externas.`,
  },
  {
    icon: Users,
    title: "3. Cadastro e Conta",
    content: "Para utilizar os serviços, você deve criar uma conta com informações verdadeiras. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta.",
  },
  {
    icon: CreditCard,
    title: "4. Planos e Pagamentos",
    content: "A plataforma oferece planos gratuitos e pagos. Ao contratar um plano pago, você concorda com os valores e condições apresentados no momento da contratação. Cancelamentos podem ser realizados a qualquer momento, sendo efetivos ao final do período vigente.",
  },
  {
    icon: Handshake,
    title: "5. Programa de Afiliados",
    content: "Ao participar do programa de afiliados, você concorda em promover produtos de forma ética e transparente. Comissões são calculadas conforme as regras de cada campanha e pagas após confirmação da venda. Práticas fraudulentas resultarão em cancelamento imediato da conta.",
  },
  {
    icon: Shield,
    title: "6. Conteúdo do Usuário",
    content: `Você mantém a propriedade do conteúdo publicado, mas concede à ${APP_NAME} uma licença não exclusiva para exibição na plataforma. É proibido publicar conteúdo ilegal, ofensivo, difamatório ou que viole direitos de terceiros.`,
  },
  {
    icon: AlertTriangle,
    title: "7. Responsabilidades",
    content: `A ${APP_NAME} não se responsabiliza por perdas financeiras decorrentes do uso da plataforma, indisponibilidades temporárias ou ações de terceiros. Os produtos promovidos são de responsabilidade das marcas cadastradas.`,
  },
  {
    icon: XCircle,
    title: "8. Rescisão",
    content: "Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos, sem aviso prévio. Você pode excluir sua conta a qualquer momento através das configurações do perfil.",
  },
  {
    icon: Scale,
    title: "9. Legislação Aplicável",
    content: "Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias.",
  },
  {
    icon: Mail,
    title: "10. Contato",
    content: "Para dúvidas sobre estes termos, entre em contato pelo e-mail: contato@onlyshop.com.br",
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-dark text-foreground overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 bg-gradient-primary" />
        <div className="absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10" style={{ background: "hsl(25 95% 53%)" }} />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-white/90 border-b border-white/20 shadow-sm">
        <div className="container flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <img src={logoImg} alt={APP_NAME} className="h-10 w-10 rounded-xl object-cover shadow-md ring-2 ring-white/50" />
          </div>
          <Button asChild size="sm" className="bg-gradient-primary border-0 glow-primary">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative z-10 pt-16 pb-10 text-center">
        <div className="container px-4">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/70">
            <ScrollText className="h-4 w-4" />
            Documento Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
            Termos de <span className="text-gradient-primary">Uso</span>
          </h1>
          <p className="text-white/50 text-sm">Última atualização: 15 de fevereiro de 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 pb-20">
        <div className="container max-w-3xl px-4 space-y-5">
          {sections.map((section) => (
            <div
              key={section.title}
              className="group rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-6 transition-all duration-300 hover:bg-white/[0.09] hover:border-white/20"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                  <section.icon className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2 min-w-0">
                  <h2 className="text-base font-semibold text-white">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-white/60">{section.content}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Link to Privacy */}
          <div className="pt-8 flex justify-center">
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-all text-sm font-medium"
            >
              <Shield className="h-4 w-4" />
              Ver Política de Privacidade
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container px-4 flex flex-col items-center gap-3">
          <img src={logoImg} alt={APP_NAME} className="h-8 w-8 rounded-lg object-cover" />
          <p className="text-xs text-white/30">© 2026 {APP_NAME}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Database, Target, Share2, Lock, UserCheck, Cookie, Clock, RefreshCw, Mail, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import logoImg from "@/assets/color-palette-ref.png";

interface Section {
  icon: React.ElementType;
  title: string;
  content: string;
  list?: string[];
}

const sections: Section[] = [
  {
    icon: Shield,
    title: "1. Introdução",
    content: `A ${APP_NAME} está comprometida com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Esta política descreve como coletamos, utilizamos e protegemos suas informações.`,
  },
  {
    icon: Database,
    title: "2. Dados Coletados",
    content: "Coletamos os seguintes tipos de dados:",
    list: [
      "Dados de cadastro: nome, e-mail, foto de perfil e informações públicas.",
      "Lista de espera: nome, e-mail, WhatsApp, perfil (Creator ou Empresa) e registro do consentimento para contato. Esses contatos são acessíveis apenas à equipe administradora.",
      "Dados de uso: interações na plataforma, posts, curtidas, comunidades e atividade de afiliado.",
      "Dados de pagamento: informações necessárias para processamento de assinaturas e comissões.",
      "Dados de integrações: informações obtidas via conexão com redes sociais como TikTok.",
      "Dados técnicos: endereço IP, tipo de navegador, dispositivo e cookies.",
    ],
  },
  {
    icon: Target,
    title: "3. Finalidade do Tratamento",
    content: "Utilizamos seus dados para:",
    list: [
      "Fornecer e melhorar nossos serviços.",
      "Processar pagamentos e comissões de afiliados.",
      "Personalizar sua experiência na plataforma.",
      "Enviar comunicações relevantes sobre sua conta.",
      "Com sua autorização, entrar em contato por e-mail e WhatsApp sobre a lista de espera e novidades da plataforma. Você pode revogar essa autorização a qualquer momento.",
      "Cumprir obrigações legais e regulatórias.",
    ],
  },
  {
    icon: Share2,
    title: "4. Compartilhamento de Dados",
    content: "Seus dados podem ser compartilhados com marcas parceiras (em campanhas de afiliado), processadores de pagamento e autoridades competentes quando exigido por lei. Não vendemos seus dados pessoais a terceiros.",
  },
  {
    icon: Lock,
    title: "5. Segurança",
    content: "Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito e em repouso, controle de acesso baseado em função (RLS) e monitoramento contínuo de segurança.",
  },
  {
    icon: UserCheck,
    title: "6. Seus Direitos (LGPD)",
    content: "Conforme a LGPD, você tem direito a:",
    list: [
      "Acessar seus dados pessoais.",
      "Corrigir dados incompletos ou desatualizados.",
      "Solicitar a exclusão dos seus dados.",
      "Revogar o consentimento a qualquer momento.",
      "Solicitar a portabilidade dos seus dados.",
    ],
  },
  {
    icon: Cookie,
    title: "7. Cookies",
    content: "Utilizamos cookies para melhorar sua experiência, manter sua sessão ativa e coletar dados analíticos. Você pode gerenciar cookies nas configurações do seu navegador.",
  },
  {
    icon: Clock,
    title: "8. Retenção de Dados",
    content: "Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política ou conforme exigido por lei. Após o encerramento da conta, os dados serão excluídos em até 30 dias, salvo obrigações legais.",
  },
  {
    icon: RefreshCw,
    title: "9. Alterações",
    content: "Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas por e-mail ou aviso na plataforma.",
  },
  {
    icon: Mail,
    title: "10. Contato do Encarregado (DPO)",
    content: "Para exercer seus direitos ou esclarecer dúvidas, entre em contato: privacidade@onlyshop.com.br",
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-dark text-foreground overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 bg-gradient-warm" />
        <div className="absolute bottom-0 -left-40 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10" style={{ background: "hsl(270 91% 65%)" }} />
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
            <Shield className="h-4 w-4" />
            Proteção de Dados
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
            Política de <span className="text-gradient-warm">Privacidade</span>
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
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center shadow-md">
                  <section.icon className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2 min-w-0">
                  <h2 className="text-base font-semibold text-white">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-white/60">{section.content}</p>
                  {section.list && (
                    <ul className="mt-3 space-y-2">
                      {section.list.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-white/55">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Link to Terms */}
          <div className="pt-8 flex justify-center">
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-all text-sm font-medium"
            >
              <ScrollText className="h-4 w-4" />
              Ver Termos de Uso
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

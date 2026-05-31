import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Share, CheckCircle2, Smartphone, Zap, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Zap,
      title: "Super rápido",
      description: "Carrega instantaneamente, como um app nativo",
    },
    {
      icon: WifiOff,
      title: "Funciona offline",
      description: "Acesse mesmo sem internet",
    },
    {
      icon: Smartphone,
      title: "Na sua tela inicial",
      description: "Acesso direto sem abrir o navegador",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8">
          <div className="h-24 w-24 rounded-3xl bg-gradient-primary shadow-lg glow-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold text-primary-foreground">O</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Only Shop</h1>
          <p className="text-muted-foreground">Conecta marcas, lojas e afiliados. Aqui ninguém vende sozinho.</p>
        </div>

        {/* Features */}
        <div className="grid gap-4 w-full max-w-sm mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-left">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Install Button */}
        {isInstalled ? (
          <Card className="w-full max-w-sm bg-success/10 border-success/30">
            <CardContent className="flex items-center justify-center gap-3 p-6">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <p className="font-semibold text-success">App instalado!</p>
                <p className="text-sm text-muted-foreground">
                  Acesse pela sua tela inicial
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card className="w-full max-w-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Share className="h-5 w-5" />
                Como instalar no iPhone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <p className="text-sm">
                  Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <p className="text-sm">
                  Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <p className="text-sm">
                  Toque em <strong>"Adicionar"</strong> no canto superior direito
                </p>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Button
            size="lg"
            className="w-full max-w-sm h-14 text-lg bg-gradient-primary hover:opacity-90 glow-primary"
            onClick={handleInstall}
          >
            <Download className="h-5 w-5 mr-2" />
            Instalar App
          </Button>
        ) : (
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Para instalar, acesse este site pelo navegador do seu celular
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Instalação gratuita • Sem ocupar espaço • Atualizações automáticas
        </p>
      </div>
    </div>
  );
}

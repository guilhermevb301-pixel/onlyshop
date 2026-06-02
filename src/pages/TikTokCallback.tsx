import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { finishTikTokConnect } from "@/lib/tiktok";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Rota /tiktok/callback — o TikTok manda o usuário de volta pra cá com ?code=&state=
export default function TikTokCallback() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("Conectando sua conta do TikTok...");

  useEffect(() => {
    if (ran.current || loading) return;
    const code = params.get("code");
    const state = params.get("state") || "";
    const err = params.get("error");

    if (err) { setStatus("error"); setMsg("Você cancelou a conexão com o TikTok."); ran.current = true; return; }
    if (!code) { setStatus("error"); setMsg("Faltou o código de autorização do TikTok."); ran.current = true; return; }
    if (!user) { setStatus("error"); setMsg("Faça login no OnlyShop antes de conectar o TikTok."); ran.current = true; return; }

    ran.current = true;
    (async () => {
      try {
        const u = await finishTikTokConnect(code, state, user.id);
        setStatus("ok");
        setMsg(`Conectado como @${u.tiktok_username || u.display_name || "você"}! 🎬`);
        toast.success("TikTok conectado!", { description: "Agora você posta direto do OnlyShop." });
        setTimeout(() => navigate("/studio"), 1600);
      } catch (e: any) {
        setStatus("error");
        setMsg(e?.message || "Não consegui conectar agora.");
      }
    })();
  }, [params, user, loading, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        {status === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />}
        {status === "ok" && <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-4" />}
        {status === "error" && <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />}
        <p className="font-medium">{msg}</p>
        {status === "error" && (
          <button onClick={() => navigate("/studio")} className="mt-4 text-sm text-primary">Voltar pro Estúdio</button>
        )}
      </div>
    </div>
  );
}

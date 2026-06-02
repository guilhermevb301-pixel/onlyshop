import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getTikTokConnection, startTikTokConnect, disconnectTikTok, type TikTokConnection,
} from "@/lib/tiktok";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Music2, Check } from "lucide-react";
import { toast } from "sonner";

// Card de conexão com o TikTok. Mostra "Conectar" ou a conta conectada.
export function ConnectTikTok() {
  const { user } = useAuth();
  const [conn, setConn] = useState<TikTokConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getTikTokConnection(user.id).then(setConn).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  async function connect() {
    setBusy(true);
    try {
      await startTikTokConnect(); // redireciona pro TikTok
    } catch (e: any) {
      toast.error("Não consegui conectar", { description: e?.message ?? "Tenta de novo." });
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!user) return;
    await disconnectTikTok(user.id);
    setConn(null);
    toast.success("TikTok desconectado");
  }

  if (loading) {
    return <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  const connected = conn?.tiktok_username || conn?.display_name;
  if (connected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={conn?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{(conn?.display_name || "T")[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1 truncate">
            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> @{conn?.tiktok_username || conn?.display_name}
          </p>
          <p className="text-[11px] text-muted-foreground">TikTok conectado · pronto pra postar</p>
        </div>
        <button onClick={disconnect} className="text-[11px] text-muted-foreground hover:text-destructive shrink-0">Desconectar</button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-black text-white h-11 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
      Conectar minha conta do TikTok
    </button>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const recoveryUrl = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady(recoveryUrl && Boolean(data.session)));
    // The client has already consumed the recovery fragment; remove credentials
    // immediately so they do not remain in history, screenshots or referrers.
    window.history.replaceState({}, "", "/auth/reset-password");
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setMessage("Use pelo menos 8 caracteres.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    setMessage(error ? "O link expirou. Solicite outro email." : "Senha atualizada. Você já pode entrar.");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 ring-1 ring-white/10">
        <Lock className="h-8 w-8 text-primary mb-4" />
        <h1 className="text-xl font-bold">Criar nova senha</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Este link é inválido ou expirou. <Link className="text-primary" to="/auth">Solicite outro</Link>.</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
            <Button className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lock, Moon, Sun, Bell, Shield, Loader2, ArrowLeft, LogOut, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { LocationNichesCard } from "@/components/profile/LocationNichesCard";
import { ConnectTikTok } from "@/components/tiktok/ConnectTikTok";

export default function Settings() {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Theme
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Senha muito curta", description: "Mínimo 6 caracteres" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Senhas não conferem" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
          <Link to="/profile"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Configurações</h1>
      </div>

      {/* Appearance */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Aparência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Modo escuro</p>
              <p className="text-xs text-muted-foreground">Alterne entre tema claro e escuro</p>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* Location & niches */}
      <LocationNichesCard />

      {/* TikTok connection */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Music2 className="h-4 w-4" />
            Redes Sociais
          </CardTitle>
          <CardDescription className="text-xs">Conecte sua conta do TikTok para postar vídeos</CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectTikTok />
        </CardContent>
      </Card>

      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </CardTitle>
          <CardDescription className="text-xs">Alterar senha da conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-[11px] text-muted-foreground/50">Nova senha</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="h-9 text-sm rounded-xl mt-1 border-border/20"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground/50">Confirmar senha</Label>
            <Input
              type="password"
              placeholder="Repita a senha"
              className="h-9 text-sm rounded-xl mt-1 border-border/20"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="w-full rounded-full bg-foreground text-background text-xs"
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : "Alterar Senha"}
          </Button>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground/50">Email</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <Separator className="bg-border/20" />
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full text-destructive border-destructive/30 text-xs gap-2"
            onClick={signOut}
          >
            <LogOut className="h-3 w-3" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      {/* Legal */}
      <div className="flex justify-center gap-4 pt-2">
        <Link to="/terms" className="text-[10px] text-muted-foreground/30 hover:text-foreground transition-colors">Termos de Uso</Link>
        <Link to="/privacy" className="text-[10px] text-muted-foreground/30 hover:text-foreground transition-colors">Privacidade</Link>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Plus, Store, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAccounts, removeAccount, type SavedAccount } from "@/lib/accounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Itens secundários + TROCA DE CONTA (PJ ↔ PF): a mesma pessoa tem conta de marca e
// de influencer e alterna sem deslogar (pedido do Biel). Se o token da outra conta
// expirou, cai no login — nunca trava.
export function UserMenu({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { user, profile, userRole, signOut } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);

  const initials =
    profile?.display_name?.split(" ").map((n) => n[0]).join("").toUpperCase() ||
    user?.email?.[0].toUpperCase() || "U";

  const others = getAccounts().filter((a) => a.user_id !== user?.id);

  const switchTo = async (acc: SavedAccount) => {
    setSwitching(acc.user_id);
    try {
      const { error } = await supabase.auth.setSession({
        access_token: acc.access_token,
        refresh_token: acc.refresh_token,
      });
      if (error) throw error;
      // Recarrega já no destino do papel da conta.
      window.location.href = acc.role === "brand" ? "/brands" : "/mapa";
    } catch {
      removeAccount(acc.user_id);
      toast.error("Sessão expirada nessa conta", { description: "Entre nela de novo." });
      window.location.href = "/auth";
    } finally {
      setSwitching(null);
    }
  };

  // Mantém a conta atual salva na lista e vai logar na outra.
  const addAccount = async () => {
    try { await signOut(); } catch { /* segue pro login mesmo assim */ }
    window.location.href = "/auth";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2.5 rounded-xl transition-colors outline-none",
            variant === "full"
              ? "w-full p-2 hover:bg-white/[0.04]"
              : "p-0.5 hover:opacity-90"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {variant === "full" && (
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold truncate leading-tight">{profile?.display_name || "Você"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "full" ? "start" : "end"} side={variant === "full" ? "top" : "bottom"} className="w-60 rounded-2xl border-border/30 shadow-lg">
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{profile?.display_name || "Usuário"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <span className="text-[9px] uppercase tracking-wide rounded-full bg-primary/15 text-primary px-1.5 py-0.5 shrink-0">
            {userRole?.role === "brand" ? "Marca" : "Influencer"}
          </span>
        </div>

        {/* Trocar de conta (PJ ↔ PF) */}
        <DropdownMenuSeparator className="bg-border/30" />
        {others.length > 0 && (
          <>
            <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Trocar de conta</p>
            {others.map((a) => (
              <DropdownMenuItem
                key={a.user_id}
                onSelect={(e) => { e.preventDefault(); switchTo(a); }}
                className="text-xs gap-2"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={a.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-[9px]">{(a.name || a.email)[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate">{a.name || a.email}</span>
                {a.role === "brand"
                  ? <Store className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  : <UserIcon className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                {switching === a.user_id && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); addAccount(); }} className="text-xs gap-2 text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Adicionar outra conta
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/30" />
        <DropdownMenuItem asChild className="text-xs"><Link to="/profile">Meu Perfil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="text-xs"><Link to="/wallet">Carteira</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="text-xs"><Link to="/settings">Configurações</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="text-xs"><Link to="/em-breve">🚀 Em breve</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="text-xs"><Link to="/install">Instalar App</Link></DropdownMenuItem>
        {userRole?.role === "admin" && (
          <DropdownMenuItem asChild className="text-xs">
            <Link to="/admin" className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Painel Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-border/30" />
        <DropdownMenuItem onClick={signOut} className="text-xs text-destructive">Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

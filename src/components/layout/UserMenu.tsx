import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Itens secundários que saíram da navegação primária (clareza por subtração).
export function UserMenu({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { user, profile, userRole, signOut } = useAuth();

  const initials =
    profile?.display_name?.split(" ").map((n) => n[0]).join("").toUpperCase() ||
    user?.email?.[0].toUpperCase() || "U";

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
      <DropdownMenuContent align={variant === "full" ? "start" : "end"} side={variant === "full" ? "top" : "bottom"} className="w-52 rounded-2xl border-border/30 shadow-lg">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold truncate">{profile?.display_name || "Usuário"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
        </div>
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

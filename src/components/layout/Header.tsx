import { Link } from "react-router-dom";
import { Bell, Search, Link2, Shield, MessageSquare, Users } from "lucide-react";
import { CartSheet } from "@/components/cart/CartSheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { APP_NAME } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoImg from "@/assets/color-palette-ref.png";

export function Header() {
  const { user, profile, userRole, signOut } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  const notifText = (type: string, actor?: string) => {
    switch (type) {
      case "like": return `${actor || "Alguém"} curtiu seu post`;
      case "comment": return `${actor || "Alguém"} comentou no seu post`;
      case "follow": return `${actor || "Alguém"} começou a te seguir`;
      default: return `${actor || "Alguém"} interagiu com você`;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass safe-area-inset-top">
      <div className="flex h-12 items-center justify-between px-4 max-w-2xl mx-auto">
        {/* Logo */}
        <Link to="/feed" className="flex items-center">
          <img src={logoImg} alt={APP_NAME} className="h-7 w-7 rounded-lg object-cover" />
        </Link>

        {/* Search - Desktop */}
        <div className="hidden md:flex flex-1 max-w-xs mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full h-8 pl-9 pr-4 rounded-full bg-muted/50 border-0 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <div className="hidden md:block">
            <InstallPrompt variant="compact" />
          </div>

          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 rounded-full text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>

          {user && (
            <>
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full text-muted-foreground">
                <Link to="/chat">
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
              <CartSheet />
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full text-muted-foreground">
                <Link to="/affiliate">
                  <Link2 className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full text-muted-foreground" onClick={markAllRead}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-2xl border-border/30 shadow-lg">
              <div className="px-3 py-2 border-b border-border/30">
                <p className="text-xs font-semibold">Notificações</p>
              </div>
              <ScrollArea className="max-h-72">
                {notifications.length === 0 ? (
                  <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <DropdownMenuItem key={n.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer">
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarImage src={n.actor?.avatarUrl} />
                        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-semibold">
                          {(n.actor?.displayName || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">{notifText(n.type, n.actor?.displayName)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />}
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ml-0.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/30 shadow-lg">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold truncate">{profile?.display_name || "Usuário"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem asChild className="text-xs"><Link to="/profile">Meu Perfil</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/meus-influencers" className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Meus Influencers</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/invites">Convites de marcas</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/discover">Descobrir (Smart Match)</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/trending">🔥 Em Alta</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/affiliate">Painel Afiliados</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/brands">Área de Marcas</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/products">Produtos</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="text-xs"><Link to="/settings">Configurações</Link></DropdownMenuItem>
                {userRole?.role === "admin" && (
                  <DropdownMenuItem asChild className="text-xs">
                    <Link to="/admin" className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Painel Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="text-xs"><Link to="/install">Instalar App</Link></DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem onClick={signOut} className="text-xs text-destructive">Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-7 text-[11px] bg-foreground text-background hover:bg-foreground/90 border-0 rounded-full px-4 ml-1">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

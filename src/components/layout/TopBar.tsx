import { Link } from "react-router-dom";
import { Bell, Search, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { CartSheet } from "@/components/cart/CartSheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserMenu } from "./UserMenu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoImg from "@/assets/color-palette-ref.png";

export function TopBar() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const notifText = (type: string, actor?: string) => {
    switch (type) {
      case "like": return `${actor || "Alguém"} curtiu seu resultado`;
      case "comment": return `${actor || "Alguém"} respondeu você lá na comunidade`;
      case "follow": return `${actor || "Alguém"} começou a te seguir`;
      case "brand_invite": return `Uma marca te chamou! Olha em Convites 👀`;
      default: return `${actor || "Alguém"} interagiu com você`;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 glass border-b border-border/40">
      <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-10">
        {/* Logo — só mobile (no desktop está na sidebar) */}
        <Link to="/inicio" className="flex items-center lg:hidden shrink-0">
          <img src={logoImg} alt="OnlyShop" className="h-7 w-7 rounded-lg object-cover" />
        </Link>

        {/* Busca — larga no desktop */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Buscar produto, influencer..."
              className="w-full h-9 pl-10 pr-4 rounded-full bg-white/[0.04] border-0 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* Spacer mobile */}
        <div className="flex-1 md:hidden" />

        {/* Ações */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-full text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>

          {user && (
            <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full text-muted-foreground">
              <Link to="/chat"><MessageSquare className="h-4 w-4" /></Link>
            </Button>
          )}

          <CartSheet />

          {/* Notificações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground" onClick={markAllRead}>
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
                  <div className="px-3 py-8 text-center text-xs text-muted-foreground">Nenhuma notificação</div>
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

          {/* Avatar/menu — só mobile (no desktop está na sidebar) */}
          {user ? (
            <div className="lg:hidden ml-0.5"><UserMenu variant="icon" /></div>
          ) : (
            <Button asChild size="sm" className="h-8 text-[11px] bg-foreground text-background hover:bg-foreground/90 border-0 rounded-full px-4 ml-1">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

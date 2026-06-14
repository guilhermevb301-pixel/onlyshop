import { NavLink } from "react-router-dom";
import {
  LayoutGrid, MapPin, BadgeDollarSign, Wallet, User, Megaphone,
  PanelLeftClose, PanelLeft, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "./SidebarContext";
import { UserMenu } from "./UserMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/color-palette-ref.png";

type Item = { to: string; icon: LucideIcon; label: string; accent?: boolean };

// Navegação enxuta por papel (MVP localizado).
const INFLUENCER_NAV: Item[] = [
  { to: "/inicio", icon: LayoutGrid, label: "Início" },
  { to: "/mapa", icon: MapPin, label: "Perto de você", accent: true },
  { to: "/affiliate", icon: BadgeDollarSign, label: "Meus ganhos", accent: true },
  { to: "/wallet", icon: Wallet, label: "Carteira" },
  { to: "/profile", icon: User, label: "Perfil" },
];
const BRAND_NAV: Item[] = [
  { to: "/brands", icon: Megaphone, label: "Minhas campanhas", accent: true },
  { to: "/wallet", icon: Wallet, label: "Carteira" },
  { to: "/profile", icon: User, label: "Perfil" },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const { userRole } = useAuth();
  const items = userRole?.role === "brand" ? BRAND_NAV : INFLUENCER_NAV;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col",
        "bg-sidebar border-r border-sidebar-border",
        "transition-[width] duration-500 ease-[var(--ease-fluid)]",
        collapsed ? "w-[var(--sb-w-collapsed)]" : "w-[var(--sb-w)]"
      )}
    >
      <div className="flex items-center gap-2.5 h-14 px-4 shrink-0">
        <img src={logoImg} alt="OnlyShop" className="h-8 w-8 rounded-lg object-cover shrink-0" />
        <span className={cn(
          "font-display text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-300",
          collapsed && "opacity-0 w-0 overflow-hidden"
        )}>OnlyShop</span>
      </div>

      <nav className="flex-1 overflow-y-auto hide-scrollbar px-3 pb-4 pt-1">
        {items.map((it) => <NavItem key={it.to} item={it} collapsed={collapsed} />)}
      </nav>

      <Footer collapsed={collapsed} toggle={toggle} />
    </aside>
  );
}

function NavItem({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const { to, icon: Icon, label, accent } = item;
  const link = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl h-10 px-3 text-sm font-medium mt-0.5",
          "transition-all duration-300 ease-[var(--ease-fluid)]",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-white/[0.05] text-foreground"
            : "text-sidebar-foreground/60 hover:text-foreground hover:bg-white/[0.03]"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
          )}
          <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && accent && "text-accent")} strokeWidth={1.75} />
          <span className={cn("truncate transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Footer({ collapsed, toggle }: { collapsed: boolean; toggle: () => void }) {
  return (
    <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
      <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
        <UserMenu variant={collapsed ? "icon" : "full"} />
        <button
          onClick={toggle}
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-foreground hover:bg-white/[0.04] transition-colors"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

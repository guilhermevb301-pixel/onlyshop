import { NavLink } from "react-router-dom";
import {
  LayoutGrid, Wand2, Package, Users, BadgeDollarSign, Flame,
  PanelLeftClose, PanelLeft, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "./SidebarContext";
import { UserMenu } from "./UserMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/color-palette-ref.png";

type Item = { to: string; icon: LucideIcon; label: string };

const GROUP_CRIAR: Item[] = [
  { to: "/products", icon: Package, label: "Produtos" },
  { to: "/meus-influencers", icon: Users, label: "Meus influencers" },
];
const GROUP_GANHAR: Item[] = [
  { to: "/affiliate", icon: BadgeDollarSign, label: "Ganhos" },
  { to: "/trending", icon: Flame, label: "Em alta" },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col",
        "bg-sidebar border-r border-sidebar-border",
        "transition-[width] duration-500 ease-[var(--ease-fluid)]",
        collapsed ? "w-[var(--sb-w-collapsed)]" : "w-[var(--sb-w)]"
      )}
    >
      {/* Topo — logo + wordmark */}
      <div className="flex items-center gap-2.5 h-14 px-4 shrink-0">
        <img src={logoImg} alt="OnlyShop" className="h-8 w-8 rounded-lg object-cover shrink-0" />
        <span className={cn(
          "font-display text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-300",
          collapsed && "opacity-0 w-0 overflow-hidden"
        )}>
          OnlyShop
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto hide-scrollbar px-3 pb-4">
        {/* Início */}
        <NavItem item={{ to: "/inicio", icon: LayoutGrid, label: "Início" }} collapsed={collapsed} />

        {/* CTA herói — Criar vídeo */}
        <HeroItem collapsed={collapsed} />

        {/* Grupo CRIAR */}
        <GroupLabel collapsed={collapsed}>Criar</GroupLabel>
        {GROUP_CRIAR.map((it) => <NavItem key={it.to} item={it} collapsed={collapsed} />)}

        {/* Grupo GANHAR */}
        <GroupLabel collapsed={collapsed}>Ganhar</GroupLabel>
        {GROUP_GANHAR.map((it) => <NavItem key={it.to} item={it} collapsed={collapsed} accentActive />)}
      </nav>

      {/* Rodapé — ganhos + usuário + colapsar */}
      <Footer collapsed={collapsed} toggle={toggle} />
    </aside>
  );
}

function GroupLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-4" />;
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 px-3 mt-5 mb-1">
      {children}
    </p>
  );
}

function NavItem({ item, collapsed, accentActive }: { item: Item; collapsed: boolean; accentActive?: boolean }) {
  const { to, icon: Icon, label } = item;
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
          <Icon
            className={cn("h-[18px] w-[18px] shrink-0", isActive && accentActive && "text-accent")}
            strokeWidth={1.75}
          />
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

function HeroItem({ collapsed }: { collapsed: boolean }) {
  const link = (
    <NavLink
      to="/studio"
      className={cn(
        "flex items-center gap-3 rounded-2xl h-12 px-3 mt-1 text-white font-semibold",
        "bg-gradient-primary shadow-[var(--shadow-glow-cta)]",
        "transition-all duration-500 ease-[var(--ease-fluid)]",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_34px_-8px_hsl(346_100%_58%/0.62)] active:scale-[0.98]",
        collapsed && "justify-center px-0"
      )}
    >
      <Wand2 className="h-[18px] w-[18px] shrink-0" />
      <span className={cn("truncate transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>
        Criar vídeo
      </span>
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">Criar vídeo</TooltipContent>
    </Tooltip>
  );
}

function Footer({ collapsed, toggle }: { collapsed: boolean; toggle: () => void }) {
  const { userRole } = useAuth();
  return (
    <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
      {/* Mini-card de ganhos (cyan = dinheiro) — estado motivacional */}
      {!collapsed && (
        <div className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 leading-none">Este mês</p>
              <p className="text-sm font-display font-bold text-accent leading-tight mt-0.5">Comece a faturar</p>
            </div>
          </div>
        </div>
      )}

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

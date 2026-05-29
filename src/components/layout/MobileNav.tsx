import { Link, useLocation } from "react-router-dom";
import { Home, Play, Sparkles, User, Wand2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/discover", icon: Sparkles, label: "Match" },
  { href: "/studio", icon: Wand2, label: "", isAction: true },
  { href: "/trending", icon: Flame, label: "Em Alta" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass safe-area-inset-bottom md:hidden dark:shadow-[0_-4px_30px_-10px_hsl(330,81%,60%,0.08)]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center justify-center"
              >
                <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-all",
                isActive ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

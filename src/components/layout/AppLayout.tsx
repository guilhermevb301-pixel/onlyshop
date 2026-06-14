import { Outlet, Navigate } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

export function AppLayout() {
  return (
    <SidebarProvider>
      <Shell />
    </SidebarProvider>
  );
}

function Shell() {
  const { collapsed } = useSidebar();
  const { user, loading } = useAuth();
  const { needsOnboarding } = useOnboarding();

  // Gate: logado mas sem papel/localização → manda pro onboarding antes de tudo.
  if (!loading && user && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return (
    <div className="min-h-[100dvh] bg-background relative">
      {/* Dark mode mesh background — matches landing page */}
      <div className="fixed inset-0 pointer-events-none dark:block hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[hsl(330,81%,60%)] opacity-[0.06] blur-[150px]" />
        <div className="absolute top-[40%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-[hsl(270,91%,65%)] opacity-[0.04] blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-[hsl(25,95%,53%)] opacity-[0.04] blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.012]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />
      </div>

      <Sidebar />

      <div
        data-collapsed={collapsed}
        className={cn(
          "transition-[padding] duration-500 ease-[var(--ease-fluid)]",
          collapsed ? "lg:pl-[var(--sb-w-collapsed)]" : "lg:pl-[var(--sb-w)]"
        )}
      >
        <TopBar />
        <main className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-6 pb-24 md:px-6 lg:px-10 lg:py-10 md:pb-10">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type SidebarCtx = { collapsed: boolean; toggle: () => void };

const Ctx = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });
const KEY = "onlyshop_sidebar_collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Lê o estado persistido só no client (evita hydration mismatch).
  useEffect(() => {
    setCollapsed(localStorage.getItem(KEY) === "1");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useSidebar() {
  return useContext(Ctx);
}

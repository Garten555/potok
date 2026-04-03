"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarStateProvider } from "@/components/layout/sidebar-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthStateProvider } from "@/components/auth/auth-context";
import { FrozenAccountGate } from "@/components/layout/frozen-account-gate";
import { DESKTOP_LG, usePotokSidebarExpanded } from "@/components/layout/use-potok-sidebar-expanded";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { expanded: isOpen, toggleExpanded: toggleSidebar } = usePotokSidebarExpanded();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const isStudioRoute = pathname.startsWith("/studio");
  const isAdminRoute = pathname.startsWith("/admin");
  const isFullBleedChrome = isStudioRoute || isAdminRoute;

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_LG);
    if (!mq.matches && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const hasSupabaseEnv =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!hasSupabaseEnv) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let unsubscribed = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!unsubscribed) {
        setIsAuthenticated(!!data.session);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      },
    );

    return () => {
      unsubscribed = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !window.matchMedia(DESKTOP_LG).matches && isOpen) {
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, toggleSidebar]);

  const onBackdropClick = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  return (
    <div className="min-h-screen w-full max-w-full min-w-0 bg-[#0a0e18] text-slate-100">
      <AuthStateProvider value={{ isAuthenticated }}>
        <SidebarStateProvider value={{ isOpen, toggleSidebar }}>
          <FrozenAccountGate isAuthenticated={isAuthenticated}>
          {isFullBleedChrome ? (
            <main className="min-h-screen w-full min-w-0 max-w-full flex-1 bg-gradient-to-b from-[#141a2a] via-[#111726] to-[#0e1422] transition-all">
              {children}
            </main>
          ) : (
            <>
          <button
            type="button"
            aria-label="Закрыть меню"
            className={clsx(
              "fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity lg:hidden",
              isOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={onBackdropClick}
          />

          <div className="flex min-h-screen w-full min-w-0 max-w-full">
            <Sidebar
              isOpen={isOpen}
              onToggle={toggleSidebar}
              isAuthenticated={isAuthenticated}
            />
            <main
              className={clsx(
                "min-h-screen w-full min-w-0 max-w-full flex-1 bg-gradient-to-b from-[#141a2a] via-[#111726] to-[#0e1422] transition-all",
              )}
            >
              {children}
            </main>
          </div>
            </>
          )}
          </FrozenAccountGate>
        </SidebarStateProvider>
      </AuthStateProvider>
    </div>
  );
}

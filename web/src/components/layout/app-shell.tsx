"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarStateProvider } from "@/components/layout/sidebar-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthStateProvider } from "@/components/auth/auth-context";
import { FrozenAccountGate } from "@/components/layout/frozen-account-gate";

const SIDEBAR_STORAGE_KEY = "potok-sidebar-open";

const DESKTOP = "(min-width: 1024px)";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  /** false = совпадает с мобильным drawer по умолчанию; на десктопе подставим из localStorage после монтирования */
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const isStudioRoute = pathname.startsWith("/studio");
  const isAdminRoute = pathname.startsWith("/admin");
  const isFullBleedChrome = isStudioRoute || isAdminRoute;

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);

    const sync = () => {
      if (mq.matches) {
        const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setIsOpen(stored === null ? true : stored === "true");
      } else {
        setIsOpen(false);
      }
    };

    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
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

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (window.matchMedia(DESKTOP).matches) {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !window.matchMedia(DESKTOP).matches) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
          {/* Затемнение под выезжающим меню (только мобильные / планшеты) */}
          <button
            type="button"
            aria-label="Закрыть меню"
            className={clsx(
              "fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity lg:hidden",
              isOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={toggleSidebar}
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

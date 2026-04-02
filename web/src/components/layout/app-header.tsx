"use client";

import clsx from "clsx";
import { Bell, CirclePlus, Grid2x2, LogIn, LogOut, Menu, Search, Shield, Tv } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "@/components/auth/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSidebarState } from "@/components/layout/sidebar-context";
import { SmartSearch } from "@/components/search/smart-search";
import { MobileSearchOverlay } from "@/components/search/mobile-search-overlay";

type HeaderProfile = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  role?: string | null;
};

type NotificationRow = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

type AppHeaderProps = {
  /** true на главной: шапка без собственного sticky — блок с чипами оборачивает в один sticky. */
  embedded?: boolean;
};

/** Верхняя шапка: как в концепте — бренд слева (иконка + ПОТОК), поиск, действия. Без второй строки. */
export function AppHeader({ embedded = false }: AppHeaderProps) {
  const { toggleSidebar } = useSidebarState();
  const { isAuthenticated } = useAuthState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const avatarFallback = useMemo(() => {
    const source = profile?.channel_name?.trim();
    if (!source) return "Ю";
    return source.slice(0, 1).toUpperCase();
  }, [profile?.channel_name]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      setIsMenuOpen(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let unsubscribed = false;

    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || unsubscribed) return;
      const authUser = data.user;
      const { data: profileData } = await supabase
        .from("users")
        .select("id, channel_name, channel_handle, avatar_url, role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileData) {
        if (!unsubscribed) setProfile(profileData);
        return;
      }

      const fallbackName =
        (authUser.user_metadata?.channel_name as string | undefined) ||
        (authUser.user_metadata?.username as string | undefined) ||
        authUser.email?.split("@")[0] ||
        "Канал";

      const { data: createdProfile } = await supabase
        .from("users")
        .upsert(
          {
            id: authUser.id,
            channel_name: fallbackName,
            avatar_url: null,
          },
          { onConflict: "id" },
        )
        .select("id, channel_name, channel_handle, avatar_url, role")
        .maybeSingle();

      if (!unsubscribed) {
        setProfile(createdProfile ?? null);
      }
    });

    return () => {
      unsubscribed = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isNotificationsOpen]);

  const loadNotifications = async () => {
    setNotifications([]);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, data, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setNotifications((data as NotificationRow[]) ?? []);
  };

  useEffect(() => {
    if (!isAuthenticated || !isNotificationsOpen) return;
    void loadNotifications();
  }, [isAuthenticated, isNotificationsOpen]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setIsSigningOut(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <header
      className={clsx(
        /* overflow-x-hidden на header обрезает выпадающие меню (overflow-y становится не visible) */
        "w-full max-w-full min-w-0 overflow-visible border-b border-white/8 bg-[#0a0d14]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md",
        embedded ? "relative z-10" : "sticky top-0 z-20",
      )}
    >
      <div className="flex h-12 min-h-12 w-full min-w-0 max-w-full items-center gap-1 px-2 sm:gap-2 sm:px-3 md:gap-3 md:px-4 lg:gap-4 lg:px-6">
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/5 text-slate-200 transition hover:bg-white/10 sm:h-10 sm:w-10 lg:hidden"
          aria-label="Открыть меню навигации"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex shrink-0 items-center">
          <div
            className="h-8 w-[4.25rem] bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat sm:h-9 sm:w-28 md:h-10 md:w-32 lg:h-11 lg:w-36"
            aria-label="Логотип POTOK"
          />
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-0.5 sm:px-2 lg:flex">
          <div className="w-full max-w-2xl min-w-0">
            <Suspense
              fallback={
                <div className="flex h-9 w-full items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5" />
              }
            >
              <SmartSearch />
            </Suspense>
          </div>
        </div>

        <div className="min-w-0 flex-1 lg:hidden" aria-hidden />

        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-[0.98] lg:hidden"
          aria-label="Открыть поиск"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </button>

        {isAuthenticated ? (
          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1.5 md:gap-2">
            {profile?.role === "moderator" || profile?.role === "admin" ? (
              <Link
                href="/admin"
                className="hidden h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:grid"
                aria-label="Модерация"
                title="Модерация"
              >
                <Shield className="h-4 w-4 text-cyan-200" />
              </Link>
            ) : null}
            <Link
              href="/studio?tab=upload"
              className="hidden h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:grid"
              aria-label="Открыть студию"
              title="Открыть студию"
            >
              <CirclePlus className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="hidden h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:grid"
              aria-label="Приложения"
            >
              <Grid2x2 className="h-4 w-4" />
            </button>
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-300 transition hover:bg-white/10"
                aria-label="Уведомления"
                aria-expanded={isNotificationsOpen}
                aria-haspopup="menu"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
              >
                <Bell className="h-4 w-4" />
              </button>
              {isNotificationsOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-80 max-w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0f1628]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
                  <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="truncate text-sm font-medium text-slate-100">Уведомления</p>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">Пока нет уведомлений</p>
                    ) : (
                      notifications.map((n) => {
                        const d = n.data ?? {};
                        const videoId = typeof d.videoId === "string" ? d.videoId : null;
                        if (n.type === "comment_reply" && videoId) {
                          return (
                            <Link
                              key={n.id}
                              href={`/watch/${videoId}`}
                              className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
                              onClick={() => setIsNotificationsOpen(false)}
                            >
                              <span className="font-medium text-cyan-100">Ответ на комментарий</span>
                              <span className="mt-0.5 block text-[11px] text-slate-500">
                                {new Date(n.created_at).toLocaleString("ru-RU")}
                              </span>
                            </Link>
                          );
                        }
                        return (
                          <div
                            key={n.id}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
                          >
                            {n.type}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-1.5 py-1 text-white shadow-[0_8px_20px_rgba(47,126,255,0.35)] transition hover:from-cyan-500/30 hover:to-blue-500/30"
                aria-label="Открыть меню профиля"
              >
                <span
                  className="grid h-7 w-7 place-items-center overflow-hidden rounded-lg border border-white/20 bg-[radial-gradient(circle_at_30%_30%,#82deff_12%,#2d9eff_48%,#0f56be_74%,#0a1d66_100%)] text-xs font-semibold"
                  style={
                    profile?.avatar_url
                      ? {
                          backgroundImage: `url(${profile.avatar_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {profile?.avatar_url ? null : avatarFallback}
                </span>
                <span className="hidden max-w-28 truncate pr-1 text-xs text-cyan-100 sm:inline">
                  {profile?.channel_name ?? "Профиль"}
                </span>
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0f1628]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
                  <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {profile?.channel_name ?? "Мой канал"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-cyan-200/90">
                      @{profile?.channel_handle ?? "channel"}
                    </p>
                  </div>
                  <Link
                    href={profile?.channel_handle ? `/@${profile.channel_handle}` : "/channel/edit"}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Tv className="h-4 w-4 text-cyan-200" />
                    Мой канал
                  </Link>
                  <Link
                    href="/studio?tab=upload"
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <CirclePlus className="h-4 w-4 text-cyan-200" />
                    Студия
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? "Выходим..." : "Выйти"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden rounded-full border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100 sm:inline">
              Гость
            </span>
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/25"
            >
              <LogIn className="h-3.5 w-3.5" />
              Войти
            </Link>
          </div>
        )}
      </div>

      <MobileSearchOverlay open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} />
    </header>
  );
}

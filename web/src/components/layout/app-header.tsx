"use client";

import clsx from "clsx";
import { Bell, Clapperboard, LogIn, LogOut, Menu, Search, Settings, Shield, Tv, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "@/components/auth/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SESSION_ROLE_CHANGED_EVENT } from "@/lib/session-role-events";
import { isAdminRole, isOwnerRole, isStaffRole } from "@/lib/user-role";
import { useSidebarState } from "@/components/layout/sidebar-context";
import { SmartSearch } from "@/components/search/smart-search";
import { MobileSearchOverlay } from "@/components/search/mobile-search-overlay";
import { NOTIFICATIONS_REFRESH_EVENT } from "@/lib/notifications-events";
import { createPusherClient } from "@/lib/pusher/client";
import {
  USER_NOTIFICATIONS_EVENT,
  USER_SESSION_ROLE_EVENT,
  userNotificationsChannelName,
} from "@/lib/pusher/user-notifications";
import { studioPathForNav } from "@/lib/studio-view-param";

type HeaderProfile = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  role?: string | null;
};

const HEADER_PROFILE_CACHE_KEY = "potok.headerProfile.v1";

function readHeaderProfileCache(userId: string): HeaderProfile | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HEADER_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; profile?: HeaderProfile };
    if (parsed.uid !== userId || !parsed.profile?.id) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

function writeHeaderProfileCache(userId: string, profile: HeaderProfile) {
  try {
    sessionStorage.setItem(HEADER_PROFILE_CACHE_KEY, JSON.stringify({ uid: userId, profile }));
  } catch {
    /* storage full / disabled */
  }
}

function clearHeaderProfileCache() {
  try {
    sessionStorage.removeItem(HEADER_PROFILE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

type NotificationRow = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

type UserPublicRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
};

/** Дополняем старые уведомления данными автора по fromUserId. */
async function enrichNotificationActors(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  rows: NotificationRow[],
): Promise<NotificationRow[]> {
  const needIds = [
    ...new Set(
      rows
        .filter((r) => {
          if (r.type !== "comment_reply" && r.type !== "comment_author_heart") return false;
          const d = r.data ?? {};
          const hasName = typeof d.fromChannelName === "string" && String(d.fromChannelName).trim().length > 0;
          return !hasName && typeof d.fromUserId === "string";
        })
        .map((r) => r.data.fromUserId as string),
    ),
  ];
  if (needIds.length === 0) return rows;
  const { data: users } = await supabase
    .from("users")
    .select("id, channel_name, channel_handle, avatar_url")
    .in("id", needIds);
  const map = new Map((users as UserPublicRow[] | null)?.map((u) => [u.id, u]) ?? []);
  return rows.map((r) => {
    if (r.type !== "comment_reply" && r.type !== "comment_author_heart") return r;
    const uid = r.data?.fromUserId;
    if (typeof uid !== "string") return r;
    const u = map.get(uid);
    if (!u) return r;
    const d = r.data ?? {};
    const nameOk = typeof d.fromChannelName === "string" && d.fromChannelName.trim().length > 0;
    return {
      ...r,
      data: {
        ...d,
        fromChannelName: nameOk ? d.fromChannelName : u.channel_name,
        fromAvatarUrl:
          typeof d.fromAvatarUrl === "string" && d.fromAvatarUrl.length > 0 ? d.fromAvatarUrl : u.avatar_url,
        fromChannelHandle:
          typeof d.fromChannelHandle === "string" && d.fromChannelHandle.length > 0
            ? d.fromChannelHandle
            : u.channel_handle,
      },
    };
  });
}

type AppHeaderProps = {
  /** true на главной: шапка без собственного sticky — блок с чипами оборачивает в один sticky. */
  embedded?: boolean;
};

/** Верхняя шапка: как в концепте — бренд слева (иконка + ПОТОК), поиск, действия. Без второй строки. */
export function AppHeader({ embedded = false }: AppHeaderProps) {
  const router = useRouter();
  const { toggleSidebar } = useSidebarState();
  const { isAuthenticated } = useAuthState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const [profileMenuPos, setProfileMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [notificationsPos, setNotificationsPos] = useState<{ top: number; left: number } | null>(null);
  const [menusMounted, setMenusMounted] = useState(false);
  const isNotificationsOpenRef = useRef(false);
  isNotificationsOpenRef.current = isNotificationsOpen;
  const avatarFallback = useMemo(() => {
    const source = profile?.channel_name?.trim();
    if (!source) return "Ю";
    return source.slice(0, 1).toUpperCase();
  }, [profile?.channel_name]);

  const refreshProfileFromServer = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    const { data: row } = await supabase
      .from("users")
      .select("id, channel_name, channel_handle, avatar_url, role")
      .eq("id", uid)
      .maybeSingle();
    const roleRes = await fetch("/api/me/role", { credentials: "same-origin", cache: "no-store" });
    const roleJson = roleRes.ok ? ((await roleRes.json()) as { role?: string | null }) : { role: null };
    const role = roleJson.role ?? (row as HeaderProfile | null)?.role ?? null;
    if (row) {
      const merged: HeaderProfile = { ...(row as HeaderProfile), role };
      setProfile(merged);
      writeHeaderProfileCache(uid, merged);
    }
  }, []);

  useEffect(() => {
    setMenusMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isMenuOpen || !profileMenuTriggerRef.current) {
      setProfileMenuPos(null);
      return;
    }
    const MENU_W = 256;
    const GAP = 8;
    const pad = 8;
    const update = () => {
      const el = profileMenuTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.max(pad, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - pad));
      setProfileMenuPos({ top: r.bottom + GAP, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isMenuOpen]);

  useLayoutEffect(() => {
    if (!isNotificationsOpen || !notificationsTriggerRef.current) {
      setNotificationsPos(null);
      return;
    }
    const PANEL_W = 320;
    const GAP = 8;
    const pad = 8;
    const update = () => {
      const el = notificationsTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.max(pad, Math.min(r.right - PANEL_W, window.innerWidth - PANEL_W - pad));
      setNotificationsPos({ top: r.bottom + GAP, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      setIsMenuOpen(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user || cancelled) return;
      const authUser = session.user;

      const cached = readHeaderProfileCache(authUser.id);
      if (cached && !cancelled) {
        setProfile(cached);
      }

      const mergeRole = (p: HeaderProfile | null, roleFromApi: string | null): HeaderProfile | null => {
        if (!p) return null;
        const role = roleFromApi ?? p.role ?? null;
        return { ...p, role };
      };

      const usersPromise = supabase
        .from("users")
        .select("id, channel_name, channel_handle, avatar_url, role")
        .eq("id", authUser.id)
        .maybeSingle();

      const rolePromise = fetch("/api/me/role", {
        credentials: "same-origin",
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : Promise.resolve({ role: null as string | null })));

      void usersPromise.then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as HeaderProfile;
        setProfile((prev) => ({
          ...row,
          role: row.role ?? prev?.role ?? null,
        }));
      });

      const [{ data: profileData }, rolePayload] = await Promise.all([usersPromise, rolePromise]);
      if (cancelled) return;

      const roleFromApi = (rolePayload as { role?: string | null }).role ?? null;

      if (profileData) {
        const merged = mergeRole(profileData as HeaderProfile, roleFromApi);
        if (merged) {
          setProfile(merged);
          writeHeaderProfileCache(authUser.id, merged);
        }
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

      if (cancelled) return;
      const merged = mergeRole((createdProfile as HeaderProfile) ?? null, roleFromApi);
      if (merged) {
        setProfile(merged);
        writeHeaderProfileCache(authUser.id, merged);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshProfileFromServer();
    };
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAuthenticated, refreshProfileFromServer]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      profileChannel = supabase
        .channel(`users-profile-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${uid}` },
          () => {
            void refreshProfileFromServer();
          },
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (profileChannel) void supabase.removeChannel(profileChannel);
    };
  }, [isAuthenticated, refreshProfileFromServer]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (profileMenuTriggerRef.current?.contains(t)) return;
      if (profileMenuPanelRef.current?.contains(t)) return;
      setIsMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (notificationsTriggerRef.current?.contains(t)) return;
      if (notificationsPanelRef.current?.contains(t)) return;
      setIsNotificationsOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isNotificationsOpen]);

  const refreshUnreadCount = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) return;
    setUnreadCount(count ?? 0);
  }, []);

  /** Только непрочитанные — просмотренные не «висят» в списке. */
  const loadNotifications = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      setNotifications([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("id, type, data, is_read, created_at")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(25);
    let rows = (data as NotificationRow[]) ?? [];
    rows = await enrichNotificationActors(supabase, rows);
    setNotifications(rows);
  }, []);

  const markNotificationRead = useCallback(
    async (id: string) => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        void refreshUnreadCount();
      }
    },
    [refreshUnreadCount],
  );

  const deleteNotification = useCallback(
    async (id: string) => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        void refreshUnreadCount();
      }
    },
    [refreshUnreadCount],
  );

  const markAllNotificationsRead = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", uid).eq("is_read", false);
    if (!error) {
      setNotifications([]);
      void refreshUnreadCount();
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    void refreshUnreadCount();
    const onRefresh = () => void refreshUnreadCount();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);

    const pusher = createPusherClient();
    let cancelled = false;
    const channelNameRef = { current: null as string | null };
    const handler = () => {
      void refreshUnreadCount();
      if (isNotificationsOpenRef.current) void loadNotifications();
    };

    const roleHandler = (data: unknown) => {
      const payload = typeof data === "object" && data && "role" in data ? (data as { role?: string }) : {};
      const nextRole = typeof payload.role === "string" ? payload.role : null;
      if (!nextRole) return;
      void supabase.auth.getSession().then(({ data: s }) => {
        const uid = s.session?.user?.id;
        if (!uid) return;
        setProfile((prev) => {
          if (!prev) return prev;
          const merged = { ...prev, role: nextRole };
          writeHeaderProfileCache(uid, merged);
          return merged;
        });
        window.dispatchEvent(new CustomEvent(SESSION_ROLE_CHANGED_EVENT, { detail: { role: nextRole } }));
      });
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const uid = data.session?.user?.id;
      if (!uid) return;
      const name = userNotificationsChannelName(uid);
      channelNameRef.current = name;
      const ch = pusher.subscribe(name);
      ch.bind(USER_NOTIFICATIONS_EVENT, handler);
      ch.bind(USER_SESSION_ROLE_EVENT, roleHandler);
    });

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      const name = channelNameRef.current;
      channelNameRef.current = null;
      if (name) {
        const ch = pusher.channel(name);
        ch?.unbind(USER_NOTIFICATIONS_EVENT, handler);
        ch?.unbind(USER_SESSION_ROLE_EVENT, roleHandler);
        pusher.unsubscribe(name);
      }
    };
  }, [isAuthenticated, refreshUnreadCount, loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !isNotificationsOpen) return;
    void loadNotifications();
  }, [isAuthenticated, isNotificationsOpen, loadNotifications]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      clearHeaderProfileCache();
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
      <div className="flex min-h-[3.25rem] w-full min-w-0 max-w-full items-center gap-2 px-2 py-1.5 sm:gap-2 sm:px-3 md:gap-3 md:px-4 lg:gap-4 lg:px-6">
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/5 text-slate-200 transition hover:bg-white/10 sm:h-10 sm:w-10 lg:hidden"
          aria-label="Открыть меню навигации"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/"
          className="flex shrink-0 items-center self-center outline-none ring-cyan-500/40 focus-visible:ring-2"
          aria-label="На главную"
        >
          <div
            className="h-8 w-[4.25rem] bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat sm:h-9 sm:w-28 md:h-10 md:w-32 lg:h-11 lg:w-36"
            aria-hidden
          />
        </Link>

        {/* Поиск прижат к правой части шапки — без «дыры» между строкой поиска и иконками */}
        <div className="hidden min-w-0 flex-1 justify-end px-0.5 sm:px-2 lg:flex">
          <div className="w-full max-w-2xl min-w-0">
            <Suspense
              fallback={
                <div className="flex h-9 w-full items-center rounded-full border border-white/10 bg-white/[0.04] px-3" />
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
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <button
              ref={notificationsTriggerRef}
              type="button"
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-300 transition hover:bg-white/10"
              aria-label={
                unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : "Уведомления"
              }
              aria-expanded={isNotificationsOpen}
              aria-haspopup="menu"
              onClick={() => {
                setIsMenuOpen(false);
                setIsNotificationsOpen((prev) => !prev);
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#0a0d14] bg-cyan-500 px-1 text-[10px] font-semibold leading-none text-[#0a1628]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
            {isStaffRole(profile?.role) ? (
              <Link
                href="/admin/overview"
                className={clsx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition",
                  "border-amber-400/45 bg-gradient-to-b from-amber-500/22 to-amber-950/40",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
                  "hover:border-amber-300/55 hover:from-amber-500/30 hover:to-amber-900/45",
                  "active:scale-[0.98]",
                )}
                title="Панель управления"
                aria-label="Панель управления"
              >
                <Shield
                  className={clsx(
                    "h-4 w-4",
                    isOwnerRole(profile?.role)
                      ? "text-violet-200"
                      : isAdminRole(profile?.role)
                        ? "text-amber-200"
                        : "text-amber-100/90",
                  )}
                  aria-hidden
                />
              </Link>
            ) : null}
            <button
              ref={profileMenuTriggerRef}
              type="button"
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsMenuOpen((prev) => !prev);
              }}
              className="flex max-w-[min(100%,14rem)] shrink-0 items-center gap-2 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-2 py-1.5 text-white shadow-[0_4px_18px_rgba(47,126,255,0.28)] ring-1 ring-white/5 transition hover:from-cyan-500/30 hover:to-blue-500/30"
              aria-label="Открыть меню профиля"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
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
                <span className="hidden max-w-28 truncate text-xs text-cyan-100 sm:inline">
                  {profile?.channel_name ?? "Профиль"}
                </span>
            </button>

            {menusMounted &&
              isNotificationsOpen &&
              notificationsPos &&
              createPortal(
                <div
                  ref={notificationsPanelRef}
                  className="fixed z-[200] w-80 max-w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0f1628]/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-md"
                  style={{ top: notificationsPos.top, left: notificationsPos.left }}
                  role="menu"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="truncate text-sm font-medium text-slate-100">Уведомления</p>
                    {notifications.length > 0 ? (
                      <button
                        type="button"
                        className="shrink-0 text-[11px] font-medium text-cyan-300/95 underline-offset-2 hover:text-cyan-200 hover:underline"
                        onClick={() => void markAllNotificationsRead()}
                      >
                        Прочитать все
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-72 space-y-1 overflow-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">Нет непрочитанных уведомлений</p>
                    ) : (
                      notifications.map((n) => {
                        const d = n.data ?? {};
                        const videoId = typeof d.videoId === "string" ? d.videoId : null;
                        if ((n.type === "comment_reply" || n.type === "comment_author_heart") && videoId) {
                          const displayName =
                            typeof d.fromChannelName === "string" && d.fromChannelName.trim()
                              ? d.fromChannelName.trim()
                              : typeof d.fromChannelHandle === "string" && d.fromChannelHandle.trim()
                                ? `@${d.fromChannelHandle.trim()}`
                                : "Пользователь";
                          const avatarUrl = typeof d.fromAvatarUrl === "string" ? d.fromAvatarUrl : null;
                          const initial = displayName.startsWith("@")
                            ? displayName.slice(1, 2).toUpperCase()
                            : displayName.slice(0, 1).toUpperCase();
                          const isHeart = n.type === "comment_author_heart";
                          const lineClass = isHeart
                            ? "border border-rose-400/35 bg-rose-500/10 shadow-[inset_2px_0_0_0_rgba(244,63,94,0.65)]"
                            : "border border-cyan-400/35 bg-cyan-500/10 shadow-[inset_2px_0_0_0_rgba(34,211,238,0.65)]";
                          const subtitle = isHeart
                            ? "Сердце от автора канала к вашему комментарию"
                            : "Ответ на ваш комментарий";
                          const subtitleColor = isHeart ? "text-rose-200/90" : "text-cyan-200/90";
                          return (
                            <div key={n.id} className={clsx("flex items-stretch gap-0.5 rounded-lg", lineClass)}>
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 gap-2.5 px-2.5 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
                                onClick={() => {
                                  void (async () => {
                                    await markNotificationRead(n.id);
                                    setIsNotificationsOpen(false);
                                    router.push(`/watch/${videoId}`);
                                  })();
                                }}
                              >
                                <span
                                  className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-slate-600/40 to-slate-900/80 text-sm font-semibold text-slate-100"
                                  style={
                                    avatarUrl
                                      ? {
                                          backgroundImage: `url(${avatarUrl})`,
                                          backgroundSize: "cover",
                                          backgroundPosition: "center",
                                        }
                                      : undefined
                                  }
                                >
                                  {avatarUrl ? null : initial || "?"}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-semibold text-slate-100">{displayName}</span>
                                  <span className={clsx("mt-0.5 block text-[11px]", subtitleColor)}>{subtitle}</span>
                                  <span className="mt-0.5 block text-[11px] text-slate-500">
                                    {new Date(n.created_at).toLocaleString("ru-RU")}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                aria-label="Удалить уведомление"
                                className="grid w-9 shrink-0 place-items-center rounded-r-lg text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteNotification(n.id);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={n.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-xs text-slate-300"
                          >
                            <span className="min-w-0 truncate">{n.type}</span>
                            <button
                              type="button"
                              aria-label="Удалить уведомление"
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/15 hover:text-rose-200"
                              onClick={() => void deleteNotification(n.id)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>,
                document.body,
              )}

            {menusMounted &&
              isMenuOpen &&
              profileMenuPos &&
              createPortal(
                <div
                  ref={profileMenuPanelRef}
                  className="fixed z-[200] w-64 max-w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0f1628]/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-md"
                  style={{ top: profileMenuPos.top, left: profileMenuPos.left }}
                  role="menu"
                >
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
                    href={studioPathForNav("upload")}
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Clapperboard className="h-4 w-4 text-cyan-200" />
                    Студия
                  </Link>
                  {isStaffRole(profile?.role) ? (
                    <Link
                      href="/admin/overview"
                      className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield
                        className={clsx(
                          "h-4 w-4",
                          isOwnerRole(profile?.role)
                            ? "text-violet-200"
                            : isAdminRole(profile?.role)
                              ? "text-amber-200"
                              : "text-cyan-200",
                        )}
                      />
                      Панель управления
                    </Link>
                  ) : null}
                  <Link
                    href="/settings"
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-cyan-200" />
                    Настройки
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
                </div>,
                document.body,
              )}
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

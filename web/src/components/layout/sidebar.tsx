"use client";

import { Suspense } from "react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Flame, LogIn, Menu, Radio, Tv, Settings, ThumbsUp, Video, ListVideo } from "lucide-react";
import { SIDEBAR_ICON_CLASS } from "@/components/layout/sidebar-icons";
import { HOME_FEED_QUERY_KEY, homeTrendingHref } from "@/lib/home-feed-param";
import { studioPathForNav } from "@/lib/studio-view-param";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  isAuthenticated: boolean;
};

const TRENDING_HREF = homeTrendingHref();

const guestNavItems = [
  { label: "Главная", icon: Radio, href: "/" },
  { label: "Тренды", icon: Flame, href: TRENDING_HREF },
];

/** Без «История» — раздел в шапке / отдельный URL; в узкой колонке только самое ходовое. */
const authNavItems = [
  { label: "Главная", icon: Radio, href: "/" },
  { label: "Подписки", icon: Tv, href: "/subscriptions" },
  { label: "Плейлисты", icon: ListVideo, href: "/playlists" },
  { label: "Понравившиеся", icon: ThumbsUp, href: "/favorites" },
  { label: "Студия", icon: Video, href: studioPathForNav("content") },
];

type NavItemConfig = (typeof guestNavItems)[number];

function navItemIsActive(
  item: NavItemConfig,
  pathname: string,
  isTrendingUrl: boolean,
): boolean {
  if (item.href === TRENDING_HREF) {
    return pathname === "/" && isTrendingUrl;
  }
  if (item.href === "/") {
    return pathname === "/" && !isTrendingUrl;
  }
  if (item.href === "/subscriptions") return pathname === "/subscriptions";
  if (item.href === "/playlists") return pathname === "/playlists";
  if (item.href === "/favorites") return pathname === "/favorites";
  if (item.href.startsWith("/studio?")) return pathname === "/studio";
  return false;
}

function SidebarPrimaryNav({
  navItems,
  pathname,
  showLabels,
  isOpen,
  onToggle,
}: {
  navItems: NavItemConfig[];
  pathname: string;
  showLabels: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const searchParams = useSearchParams();
  const isTrendingUrl =
    searchParams.get(HOME_FEED_QUERY_KEY) === "t" || searchParams.get("tab") === "trending";

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = navItemIsActive(item, pathname, isTrendingUrl);

        return (
          <Link
            key={item.label}
            href={item.href}
            title={item.label}
            onClick={() => {
              if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                onToggle();
              }
            }}
            className={clsx(
              "group flex min-w-0 rounded-xl text-sm font-medium transition",
              showLabels
                ? "w-full flex-row items-center gap-3 px-3 py-2.5 text-left"
                : "w-full flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-center",
              isActive
                ? "bg-[#2f74ff]/18 text-[#b7d9ff] shadow-[inset_0_0_0_1px_rgba(83,153,255,0.35)]"
                : "text-slate-300 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className={clsx("shrink-0", showLabels ? SIDEBAR_ICON_CLASS : "h-7 w-7")} aria-hidden />
            <span
              className={clsx(
                "min-w-0 transition-[opacity] duration-300",
                showLabels
                  ? "flex-1 overflow-hidden text-left whitespace-nowrap opacity-100"
                  : "line-clamp-2 max-w-[5rem] text-[10px] font-medium leading-tight opacity-100",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}

function SidebarPrimaryNavFallback({
  navItems,
  showLabels,
  isOpen,
  onToggle,
}: {
  navItems: NavItemConfig[];
  showLabels: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            title={item.label}
            onClick={() => {
              if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                onToggle();
              }
            }}
            className={clsx(
              "group flex min-w-0 rounded-xl text-sm font-medium transition",
              showLabels
                ? "w-full flex-row items-center gap-3 px-3 py-2.5 text-left"
                : "w-full flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-center",
              "text-slate-300 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className={clsx("shrink-0", showLabels ? SIDEBAR_ICON_CLASS : "h-7 w-7")} aria-hidden />
            <span
              className={clsx(
                "min-w-0",
                showLabels
                  ? "flex-1 overflow-hidden text-left whitespace-nowrap"
                  : "line-clamp-2 max-w-[5rem] text-[10px] font-medium leading-tight",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({ isOpen, onToggle, isAuthenticated }: SidebarProps) {
  /** На lg+ «открыт» = широкая панель; на мобильном — только выезд drawer */
  const showLabels = isOpen;
  const navItems = isAuthenticated ? authNavItems : guestNavItems;
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "h-screen shrink-0 border-r border-white/10",
        "bg-gradient-to-b from-[#111523] via-[#0d111d] to-[#0a0d17] backdrop-blur-md",
        "shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        "transition-[transform,width] duration-300 ease-out",
        // Мобильный / планшет: выезжающая панель
        "max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:z-50 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:pt-[env(safe-area-inset-top)]",
        "max-lg:w-[min(18rem,88vw)] max-lg:overflow-y-auto max-lg:px-3 max-lg:py-2.5",
        isOpen ? "max-lg:translate-x-0" : "max-lg:pointer-events-none max-lg:-translate-x-full",
        // Десктоп: в потоке, узкий или широкий режим
        "lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
        isOpen ? "lg:w-64 lg:px-3 lg:py-2.5" : "lg:w-[5.75rem] lg:px-1 lg:py-1.5",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={clsx(
            "mb-2 flex border-b border-white/8 pb-2.5",
            showLabels ? "items-center gap-2" : "items-center gap-2 lg:mb-1.5 lg:w-full lg:flex-col lg:items-stretch lg:gap-1.5 lg:pb-1.5",
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            title={isOpen ? "Свернуть меню" : "Развернуть меню"}
            className={clsx(
              "grid shrink-0 place-items-center text-slate-200 transition",
              isOpen
                ? "h-9 w-9 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10"
                : "h-9 w-9 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 max-lg:h-9 max-lg:w-9 max-lg:rounded-xl lg:h-10 lg:w-full lg:rounded-lg lg:border-white/[0.08] lg:bg-white/[0.04] lg:hover:bg-white/[0.09]",
            )}
            aria-label={isOpen ? "Свернуть меню" : "Открыть меню"}
          >
            <Menu className={clsx("shrink-0", SIDEBAR_ICON_CLASS)} />
          </button>

          {showLabels ? (
            <Link
              href="/"
              onClick={() => {
                if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                  onToggle();
                }
              }}
              className={clsx(
                "h-10 w-36 shrink-0 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat opacity-100 transition-opacity hover:opacity-90",
              )}
              aria-label="ПОТОК — на главную"
            />
          ) : (
            <div className="h-10 w-0 shrink-0 opacity-0 lg:hidden" aria-hidden />
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto pt-1 sm:gap-2 lg:gap-2">
          <Suspense
            fallback={
              <SidebarPrimaryNavFallback
                navItems={navItems}
                showLabels={showLabels}
                isOpen={isOpen}
                onToggle={onToggle}
              />
            }
          >
            <SidebarPrimaryNav
              navItems={navItems}
              pathname={pathname}
              showLabels={showLabels}
              isOpen={isOpen}
              onToggle={onToggle}
            />
          </Suspense>
        </nav>

        {!isAuthenticated ? (
          showLabels ? (
            <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-3">
              <p className="text-xs text-slate-300">
                Войдите, чтобы видеть подписки, плейлисты и персональные рекомендации.
              </p>
              <Link
                href="/auth"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-400/15 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/25"
              >
                <LogIn className={SIDEBAR_ICON_CLASS} />
                Войти
              </Link>
            </div>
          ) : (
            <Link
              href="/auth"
              title="Войти в аккаунт"
              aria-label="Войти для персональных рекомендаций"
              className={clsx(
                "mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-0.5 py-2.5 text-cyan-100 transition hover:bg-cyan-500/20",
              )}
            >
              <LogIn className="h-7 w-7 shrink-0" aria-hidden />
              <span className="max-w-[5rem] text-center text-[10px] font-medium leading-tight">Войти</span>
            </Link>
          )
        ) : null}

        <div className="mt-auto border-t border-white/8 pt-3">
          <Link
            href="/settings"
            title="Настройки аккаунта"
            onClick={() => {
              if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                onToggle();
              }
            }}
            className={clsx(
              "flex min-w-0 rounded-xl text-slate-300 transition hover:bg-white/8 hover:text-white",
              showLabels
                ? "w-full flex-row items-center gap-3 px-3 py-2.5 text-left"
                : "w-full flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-center",
            )}
          >
            <Settings className={clsx("shrink-0", showLabels ? SIDEBAR_ICON_CLASS : "h-7 w-7")} aria-hidden />
            <span
              className={clsx(
                "min-w-0",
                showLabels
                  ? "flex-1 overflow-hidden text-left whitespace-nowrap"
                  : "line-clamp-2 max-w-[5rem] text-[10px] font-medium leading-tight",
              )}
            >
              Настройки
            </span>
          </Link>

          {showLabels ? (
            <nav
              className="mt-3 space-y-1 border-t border-white/[0.06] pt-2.5"
              aria-label="Правовая информация"
            >
              <Link
                href="/rules"
                onClick={() => {
                  if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                    onToggle();
                  }
                }}
                className="block rounded-md px-1 py-0.5 text-[10px] leading-snug text-slate-600 transition hover:text-slate-400"
              >
                Правила сервиса
              </Link>
              <Link
                href="/privacy"
                onClick={() => {
                  if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                    onToggle();
                  }
                }}
                className="block rounded-md px-1 py-0.5 text-[10px] leading-snug text-slate-600 transition hover:text-slate-400"
              >
                Политика персональных данных
              </Link>
              <Link
                href="/offer"
                onClick={() => {
                  if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                    onToggle();
                  }
                }}
                className="block rounded-md px-1 py-0.5 text-[10px] leading-snug text-slate-600 transition hover:text-slate-400"
              >
                Пользовательское соглашение
              </Link>
            </nav>
          ) : null}

          {showLabels ? (
            <p className="mt-2.5 px-1 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-slate-600/80">
              © ПОТОК · 2026
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

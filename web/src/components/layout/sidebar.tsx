"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  LogIn,
  Menu,
  ListVideo,
  Clock,
  PlayCircle,
  Radio,
  Tv,
  Settings,
  ThumbsUp,
} from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  isAuthenticated: boolean;
};

const guestNavItems = [
  { label: "Главная", icon: Radio, href: "/" },
  { label: "Тренды", icon: Flame, href: "/?tab=trending" },
];

const authNavItems = [
  { label: "Главная", icon: Radio, href: "/" },
  { label: "Подписки", icon: Tv, href: "/?tab=subscriptions" },
  { label: "Для вас", icon: PlayCircle, href: "/?tab=for-you" },
  { label: "История", icon: Clock, href: "/?tab=history" },
  { label: "Понравившиеся", icon: ThumbsUp, href: "/favorites" },
  { label: "Ваши видео", icon: ListVideo, href: "/studio?tab=content" },
];

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
        isOpen ? "lg:w-64 lg:px-3 lg:py-2.5" : "lg:w-[4.8rem] lg:px-2.5 lg:py-2",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-2 flex items-center gap-2 border-b border-white/8 pb-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label={isOpen ? "Свернуть меню" : "Открыть меню"}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div
            className={clsx(
              "h-10 shrink-0 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat transition-[width,opacity] duration-300",
              showLabels ? "w-36 opacity-100" : "w-0 opacity-0",
            )}
            aria-label="Логотип ПОТОК"
          />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto pt-1 sm:gap-2 lg:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" && pathname === "/";

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => {
                  if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                    onToggle();
                  }
                }}
                className={clsx(
                  "group flex min-w-0 items-center gap-3 rounded-xl py-2.5 text-left text-sm font-medium transition",
                  showLabels ? "w-full px-3" : "w-full justify-center px-0 lg:justify-center",
                  isActive
                    ? "bg-[#2f74ff]/18 text-[#b7d9ff] shadow-[inset_0_0_0_1px_rgba(83,153,255,0.35)]"
                    : "text-slate-300 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span
                  className={clsx(
                    "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                    showLabels
                      ? "flex-1 whitespace-nowrap opacity-100"
                      : "w-0 flex-none opacity-0",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {!isAuthenticated ? (
          showLabels ? (
            <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-3">
              <p className="text-xs text-slate-300">
                Войдите, чтобы видеть подписки, историю и персональные рекомендации.
              </p>
              <Link
                href="/auth"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-400/15 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/25"
              >
                <LogIn className="h-3.5 w-3.5" />
                Войти
              </Link>
            </div>
          ) : (
            <Link
              href="/auth"
              title="Войдите, чтобы видеть подписки, историю и персональные рекомендации."
              aria-label="Войти для персональных рекомендаций"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 py-2.5 text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <LogIn className="h-4 w-4" />
            </Link>
          )
        ) : null}

        <div className="mt-auto border-t border-white/8 pt-3">
          <button
            type="button"
            className={clsx(
              "flex min-w-0 w-full items-center gap-3 rounded-xl py-2.5 text-slate-300 transition hover:bg-white/8 hover:text-white",
              showLabels ? "px-3" : "justify-center px-0 lg:justify-center",
            )}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels
                  ? "flex-1 whitespace-nowrap opacity-100"
                  : "w-0 flex-none opacity-0",
              )}
            >
              Настройки
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

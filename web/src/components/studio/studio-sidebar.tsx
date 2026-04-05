"use client";

import Link from "next/link";
import clsx from "clsx";
import { BarChart3, Flag, Home, LayoutGrid, ListVideo, Menu, UploadCloud, Video, X } from "lucide-react";
import { SIDEBAR_ICON_CLASS, SIDEBAR_ICON_RAIL_CLASS, SIDEBAR_NAV_COLLAPSED_SQ } from "@/components/layout/sidebar-icons";
import {
  usePotokSidebarExpanded,
  useSidebarShowLabels,
} from "@/components/layout/use-potok-sidebar-expanded";

type StudioSidebarProps = {
  activeNav: "upload" | "content" | "playlists" | "stats" | "channel_home" | "incoming_reports";
  onSelect: (next: StudioSidebarProps["activeNav"]) => void;
  /** Открыт ли выездной drawer на узких экранах */
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const navBtnClass = (active: boolean, showLabels: boolean) =>
  clsx(
    "flex min-w-0 items-center rounded-xl text-left text-sm font-medium transition",
    showLabels
      ? "w-full gap-3 px-3 py-2.5"
      : clsx("w-full justify-center gap-0 px-0 py-2.5", SIDEBAR_NAV_COLLAPSED_SQ),
    active
      ? "bg-[#2f74ff]/18 text-[#b7d9ff] shadow-[inset_0_0_0_1px_rgba(83,153,255,0.35)]"
      : "text-slate-300 hover:bg-white/8 hover:text-white",
  );

const STUDIO_NAV_ROWS: Array<{
  id: StudioSidebarProps["activeNav"];
  label: string;
  hint: string;
  Icon: typeof UploadCloud;
}> = [
  {
    id: "upload",
    label: "Загрузка видео",
    hint: "Новый ролик: файл, описание, превью и публикация",
    Icon: UploadCloud,
  },
  { id: "content", label: "Ваши видео", hint: "Библиотека роликов, редактирование и удаление", Icon: Video },
  { id: "stats", label: "Статистика", hint: "Просмотры, подписчики и графики канала", Icon: BarChart3 },
  { id: "playlists", label: "Плейлисты", hint: "Сборки роликов для канала и для себя", Icon: ListVideo },
  { id: "channel_home", label: "Внешний вид канала", hint: "Главная страница канала и секции", Icon: LayoutGrid },
  {
    id: "incoming_reports",
    label: "Жалобы на контент",
    hint: "Обращения зрителей на ваши видео и канал",
    Icon: Flag,
  },
];

export function StudioSidebar({ activeNav, onSelect, mobileOpen, onMobileClose }: StudioSidebarProps) {
  const { expanded, toggleExpanded } = usePotokSidebarExpanded();
  const showLabels = useSidebarShowLabels(expanded, mobileOpen);

  const handleSelect = (next: StudioSidebarProps["activeNav"]) => {
    onSelect(next);
    onMobileClose();
  };

  return (
    <aside
      className={clsx(
        "flex shrink-0 flex-col border-r border-white/10",
        "bg-gradient-to-b from-[#111523] via-[#0d111d] to-[#0a0d17] backdrop-blur-md",
        "shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        "transition-[transform,width] duration-300 ease-out",
        "fixed inset-y-0 left-0 z-50 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:pt-[env(safe-area-inset-top)]",
        "max-lg:w-[min(18rem,88vw)] max-lg:overflow-y-auto max-lg:px-3 max-lg:py-2.5",
        mobileOpen ? "max-lg:translate-x-0" : "max-lg:pointer-events-none max-lg:-translate-x-full",
        "lg:pointer-events-auto lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
        expanded ? "lg:w-64 lg:px-3 lg:py-2.5" : "lg:w-[5.25rem] lg:px-1 lg:py-1.5",
        "max-h-screen overflow-y-auto lg:self-start",
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
            onClick={() => {
              if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
                toggleExpanded();
              }
            }}
            className={clsx(
              "grid shrink-0 place-items-center text-slate-200 transition max-lg:hidden",
              expanded
                ? "h-9 w-9 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10"
                : "h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.09]",
            )}
            title={expanded ? "Свернуть меню студии" : "Развернуть меню студии"}
            aria-label={expanded ? "Свернуть меню студии" : "Развернуть меню студии"}
          >
            <Menu className={SIDEBAR_ICON_CLASS} />
          </button>
          {showLabels ? (
            <Link
              href="/"
              className="h-10 w-36 shrink-0 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat opacity-100 transition-opacity hover:opacity-90"
              aria-label="ПОТОК — на главную"
            />
          ) : (
            <div className="h-10 w-0 shrink-0 overflow-hidden opacity-0 lg:hidden" aria-hidden />
          )}
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={onMobileClose}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:hidden"
            title="Закрыть меню"
          >
            <X className={SIDEBAR_ICON_CLASS} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 pt-1 sm:gap-2">
          {STUDIO_NAV_ROWS.map(({ id, label, hint, Icon }) => (
            <button
              key={id}
              type="button"
              title={`${label} — ${hint}`}
              onClick={() => handleSelect(id)}
              className={navBtnClass(activeNav === id, showLabels)}
            >
              <Icon className={showLabels ? SIDEBAR_ICON_CLASS : SIDEBAR_ICON_RAIL_CLASS} />
              <span
                className={clsx(
                  "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                  showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-4 shrink-0 border-t border-white/8 pt-3">
          <Link
            href="/"
            title="На главную — выйти из студии на сайт"
            onClick={onMobileClose}
            className={clsx(
              "flex min-w-0 items-center rounded-xl text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white",
              showLabels
                ? "w-full gap-3 px-3 py-2.5"
                : clsx("w-full justify-center gap-0 px-0 py-2.5", SIDEBAR_NAV_COLLAPSED_SQ),
            )}
          >
            <Home className={clsx(showLabels ? SIDEBAR_ICON_CLASS : SIDEBAR_ICON_RAIL_CLASS, "text-slate-300")} />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              На главную
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

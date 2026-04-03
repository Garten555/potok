"use client";

import Link from "next/link";
import clsx from "clsx";
import { BarChart3, Clapperboard, Flag, Home, LayoutGrid, ListVideo, Menu, UploadCloud, Video, X } from "lucide-react";
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
    "flex w-full min-w-0 items-center gap-3 rounded-xl py-2.5 text-left text-sm font-medium transition",
    showLabels ? "px-3" : "justify-center px-0 lg:justify-center",
    active
      ? "bg-[#2f74ff]/18 text-[#b7d9ff] shadow-[inset_0_0_0_1px_rgba(83,153,255,0.35)]"
      : "text-slate-300 hover:bg-white/8 hover:text-white",
  );

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
        expanded ? "lg:w-64 lg:px-3 lg:py-2.5" : "lg:w-[4.8rem] lg:px-2.5 lg:py-2",
        "max-h-screen overflow-y-auto lg:self-start",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-2 flex items-center gap-2 border-b border-white/8 pb-2.5">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
                toggleExpanded();
              }
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10 max-lg:hidden"
            aria-label={expanded ? "Свернуть меню студии" : "Развернуть меню студии"}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div
            className={clsx(
              "h-10 shrink-0 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat transition-[width,opacity] duration-300",
              showLabels ? "w-36 opacity-100" : "w-0 overflow-hidden opacity-0 lg:w-0",
            )}
            aria-label="ПОТОК"
          />
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={onMobileClose}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={clsx(
            "mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2",
            showLabels ? "px-3" : "justify-center px-0 lg:justify-center",
          )}
        >
          <Clapperboard className="h-[18px] w-[18px] shrink-0 text-cyan-200/90" aria-hidden />
          <span
            className={clsx(
              "truncate text-sm font-medium text-slate-200 transition-[opacity,width] duration-300",
              showLabels ? "max-w-[10rem] opacity-100" : "w-0 opacity-0",
            )}
          >
            Potok Studio
          </span>
        </div>

        <nav className="flex flex-col gap-1.5 pt-1 sm:gap-2">
          <button type="button" onClick={() => handleSelect("upload")} className={navBtnClass(activeNav === "upload", showLabels)}>
            <UploadCloud className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Загрузка видео
            </span>
          </button>
          <button type="button" onClick={() => handleSelect("content")} className={navBtnClass(activeNav === "content", showLabels)}>
            <Video className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Ваши видео
            </span>
          </button>
          <button type="button" onClick={() => handleSelect("stats")} className={navBtnClass(activeNav === "stats", showLabels)}>
            <BarChart3 className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Статистика
            </span>
          </button>
          <button type="button" onClick={() => handleSelect("playlists")} className={navBtnClass(activeNav === "playlists", showLabels)}>
            <ListVideo className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Плейлисты
            </span>
          </button>
          <button type="button" onClick={() => handleSelect("channel_home")} className={navBtnClass(activeNav === "channel_home", showLabels)}>
            <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Внешний вид канала
            </span>
          </button>
          <button type="button" onClick={() => handleSelect("incoming_reports")} className={navBtnClass(activeNav === "incoming_reports", showLabels)}>
            <Flag className="h-[18px] w-[18px] shrink-0" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Жалобы на контент
            </span>
          </button>
        </nav>

        <div className="mt-4 shrink-0 border-t border-white/8 pt-3">
          <Link
            href="/"
            onClick={onMobileClose}
            className={clsx(
              "flex min-w-0 items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white",
              showLabels ? "px-3" : "justify-center px-0 lg:justify-center",
            )}
          >
            <Home className="h-[18px] w-[18px] shrink-0 text-slate-300" />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              На сайт
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import clsx from "clsx";
import { BarChart3, Clapperboard, Flag, Home, LayoutGrid, ListVideo, UploadCloud, Video, X } from "lucide-react";

type StudioSidebarProps = {
  activeNav: "upload" | "content" | "playlists" | "stats" | "channel_home" | "incoming_reports";
  onSelect: (next: StudioSidebarProps["activeNav"]) => void;
  /** Открыт ли выездной drawer на узких экранах */
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const navBtnClass = (active: boolean) =>
  clsx(
    "flex w-full min-w-0 items-center gap-3 rounded-xl py-2.5 text-left text-sm font-medium transition",
    "px-3",
    active
      ? "bg-[#2f74ff]/18 text-[#b7d9ff] shadow-[inset_0_0_0_1px_rgba(83,153,255,0.35)]"
      : "text-slate-300 hover:bg-white/8 hover:text-white",
  );

export function StudioSidebar({ activeNav, onSelect, mobileOpen, onMobileClose }: StudioSidebarProps) {
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
        "transition-transform duration-300 ease-out",
        "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] max-lg:pb-[env(safe-area-inset-bottom)] max-lg:pt-[env(safe-area-inset-top)]",
        "lg:z-auto lg:w-64 lg:min-w-[16rem] lg:max-w-none",
        "lg:translate-x-0",
        "max-h-screen overflow-y-auto lg:sticky lg:top-0 lg:self-start",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex h-full min-h-0 flex-col px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/8 pb-2.5">
          <div
            className="h-10 w-36 shrink-0 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat"
            aria-label="ПОТОК"
          />
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={onMobileClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <Clapperboard className="h-[18px] w-[18px] shrink-0 text-cyan-200/90" aria-hidden />
          <span className="truncate text-sm font-medium text-slate-200">Potok Studio</span>
        </div>

        <nav className="flex flex-col gap-1.5 pt-1 sm:gap-2">
          <button type="button" onClick={() => handleSelect("upload")} className={navBtnClass(activeNav === "upload")}>
            <UploadCloud className="h-[18px] w-[18px] shrink-0" />
            Загрузка видео
          </button>
          <button type="button" onClick={() => handleSelect("content")} className={navBtnClass(activeNav === "content")}>
            <Video className="h-[18px] w-[18px] shrink-0" />
            Ваши видео
          </button>
          <button type="button" onClick={() => handleSelect("stats")} className={navBtnClass(activeNav === "stats")}>
            <BarChart3 className="h-[18px] w-[18px] shrink-0" />
            Статистика
          </button>
          <button
            type="button"
            onClick={() => handleSelect("playlists")}
            className={navBtnClass(activeNav === "playlists")}
          >
            <ListVideo className="h-[18px] w-[18px] shrink-0" />
            Плейлисты
          </button>
          <button
            type="button"
            onClick={() => handleSelect("channel_home")}
            className={navBtnClass(activeNav === "channel_home")}
          >
            <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
            Внешний вид канала
          </button>
          <button
            type="button"
            onClick={() => handleSelect("incoming_reports")}
            className={navBtnClass(activeNav === "incoming_reports")}
          >
            <Flag className="h-[18px] w-[18px] shrink-0" />
            Жалобы на контент
          </button>
        </nav>

        <div className="mt-4 shrink-0 border-t border-white/8 pt-3">
          <Link
            href="/"
            onClick={onMobileClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white"
          >
            <Home className="h-[18px] w-[18px] shrink-0 text-slate-300" />
            На сайт
          </Link>
        </div>
      </div>
    </aside>
  );
}

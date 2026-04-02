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

export function StudioSidebar({ activeNav, onSelect, mobileOpen, onMobileClose }: StudioSidebarProps) {
  const handleSelect = (next: StudioSidebarProps["activeNav"]) => {
    onSelect(next);
    onMobileClose();
  };

  return (
    <aside
      className={clsx(
        "flex shrink-0 flex-col border-r border-white/10 bg-[#0b1020] p-3 transition-transform duration-200 ease-out",
        "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] shadow-2xl shadow-black/50",
        "lg:z-auto lg:w-56 lg:min-w-[14rem] lg:max-w-[16rem] xl:w-64 xl:max-w-none",
        "lg:translate-x-0 lg:shadow-none",
        "lg:sticky lg:top-0 lg:h-[min(100vh,100dvh)] lg:overflow-y-auto lg:self-start",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <Clapperboard className="h-4 w-4 shrink-0 text-cyan-200" />
          <span className="truncate text-sm font-semibold text-slate-100">POTOK Studio</span>
        </div>
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={onMobileClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col space-y-1">
        <button
          type="button"
          onClick={() => handleSelect("upload")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
            activeNav === "upload"
              ? "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100"
              : "text-slate-300 hover:bg-white/8",
          )}
        >
          <UploadCloud className="h-4 w-4 shrink-0" />
          Загрузка видео
        </button>
        <button
          type="button"
          onClick={() => handleSelect("content")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
            activeNav === "content"
              ? "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100"
              : "text-slate-300 hover:bg-white/8",
          )}
        >
          <Video className="h-4 w-4 shrink-0" />
          Ваши видео
        </button>
        <button
          type="button"
          onClick={() => handleSelect("stats")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
            activeNav === "stats"
              ? "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100"
              : "text-slate-300 hover:bg-white/8",
          )}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          Статистика
        </button>
        <button
          type="button"
          onClick={() => handleSelect("playlists")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
            activeNav === "playlists"
              ? "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100"
              : "text-slate-300 hover:bg-white/8",
          )}
        >
          <ListVideo className="h-4 w-4 shrink-0" />
          Плейлисты
        </button>
        <button
          type="button"
          onClick={() => handleSelect("channel_home")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
            activeNav === "channel_home"
              ? "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100"
              : "text-slate-300 hover:bg-white/8",
          )}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          Внешний вид канала
        </button>
        <button
          type="button"
          onClick={() => handleSelect("incoming_reports")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
            activeNav === "incoming_reports"
              ? "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100"
              : "text-slate-300 hover:bg-white/8",
          )}
        >
          <Flag className="h-4 w-4 shrink-0" />
          Жалобы на контент
        </button>
        <Link
          href="/"
          onClick={onMobileClose}
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/8 lg:mt-2"
        >
          <Home className="h-4 w-4 shrink-0" />
          На сайт
        </Link>
      </nav>
    </aside>
  );
}

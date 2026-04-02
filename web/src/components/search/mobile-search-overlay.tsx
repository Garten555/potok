"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { SmartSearch } from "@/components/search/smart-search";

type MobileSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

/** Полноэкранный поиск в стиле YouTube: поле + подсказки, без горизонтального скролла страницы. */
export function MobileSearchOverlay({ open, onClose }: MobileSearchOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const backButton = (
    <button
      type="button"
      onClick={onClose}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 active:bg-white/15"
      aria-label="Закрыть поиск"
    >
      <ArrowLeft className="h-6 w-6" />
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0a0d14] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      role="dialog"
      aria-modal="true"
      aria-label="Поиск"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-3 pt-2">
        <SmartSearch variant="overlay" onClose={onClose} leading={backButton} />
      </div>
    </div>,
    document.body,
  );
}

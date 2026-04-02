"use client";

import clsx from "clsx";
import { Delete, X } from "lucide-react";
import { useState } from "react";

type LayoutId = "ru" | "en" | "num";

const ROWS_RU = [
  ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х"],
  ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
  ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю", "ё"],
];

const ROWS_EN = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const ROWS_NUM = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["@", "#", "%", "&", "*", "(", ")", "-", "_", "="],
  [".", ",", "!", "?", ":", ";", '"', "'", "/"],
];

type VirtualKeyboardProps = {
  onInsert: (ch: string) => void;
  onBackspace: () => void;
  onClose?: () => void;
  className?: string;
  compact?: boolean;
};

export function VirtualKeyboard({ onInsert, onBackspace, onClose, className, compact }: VirtualKeyboardProps) {
  const [tab, setTab] = useState<LayoutId>("ru");

  const rows = tab === "ru" ? ROWS_RU : tab === "en" ? ROWS_EN : ROWS_NUM;

  return (
    <div
      className={clsx(
        "rounded-xl border border-white/10 bg-[#0c101c]/98 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]",
        compact ? "text-[11px]" : "text-sm",
        className,
      )}
      role="group"
      aria-label="Экранная клавиатура"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(
            [
              ["ru", "РУ"],
              ["en", "EN"],
              ["num", "123"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                "rounded-lg px-2.5 py-1 font-medium transition",
                tab === id ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:bg-white/[0.06]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200"
            aria-label="Скрыть клавиатуру"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex flex-wrap justify-center gap-1">
            {row.map((ch) => (
              <button
                key={`${ri}-${ch}`}
                type="button"
                onClick={() => onInsert(ch)}
                className={clsx(
                  "min-w-[1.75rem] rounded-lg border border-white/10 bg-white/[0.05] font-medium text-slate-100 transition hover:bg-white/[0.12] active:scale-[0.97]",
                  compact ? "px-1.5 py-1.5" : "px-2 py-2",
                )}
              >
                {ch}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => onInsert(" ")}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.06] py-2 text-slate-200 transition hover:bg-white/[0.1]"
        >
          Пробел
        </button>
        <button
          type="button"
          onClick={onBackspace}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-200 transition hover:bg-white/[0.1]"
          aria-label="Удалить символ"
        >
          <Delete className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

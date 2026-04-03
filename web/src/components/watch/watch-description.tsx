"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";

type WatchDescriptionProps = {
  text: string | null;
};

/** ~4 строки при leading-relaxed ~1.625 */
const COLLAPSED_MAX_PX = 88;

export function WatchDescription({ text }: WatchDescriptionProps) {
  const raw = text?.trim() ?? "";
  const [expanded, setExpanded] = useState(false);
  const [longEnough, setLongEnough] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || !raw) {
      setLongEnough(false);
      return;
    }
    setLongEnough(el.scrollHeight > COLLAPSED_MAX_PX + 1);
  }, [raw]);

  if (!raw) {
    return (
      <div className="mt-4 rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-slate-500">Описание отсутствует.</div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-white/[0.04] px-4 py-3">
      <div
        className={clsx(!expanded && "overflow-hidden")}
        style={!expanded ? { maxHeight: COLLAPSED_MAX_PX } : undefined}
      >
        <div ref={innerRef} className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
          {raw}
        </div>
      </div>
      {longEnough ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
        >
          {expanded ? "Свернуть" : "Показать полностью"}
        </button>
      ) : null}
    </div>
  );
}

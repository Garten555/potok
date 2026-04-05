"use client";

import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import {
  MAX_VIDEO_TAGS,
  MAX_VIDEO_TAG_LEN,
  normalizeOneTag,
} from "@/lib/studio-video-tags";

function stopPlayerHotkeys(event: KeyboardEvent<HTMLInputElement>) {
  event.stopPropagation();
}

export type StudioVideoTagsFieldProps = {
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  error?: string;
  onClearError: () => void;
  onCommitBlocked?: (reason: "too_long" | "max_tags") => void;
  inputId?: string;
};

export function StudioVideoTagsField({
  tags,
  setTags,
  draft,
  setDraft,
  error,
  onClearError,
  onCommitBlocked,
  inputId = "studio-video-tags-input",
}: StudioVideoTagsFieldProps) {
  const tryCommit = () => {
    const t = normalizeOneTag(draft);
    if (!t) {
      setDraft("");
      onClearError();
      return;
    }
    if (t.length > MAX_VIDEO_TAG_LEN) {
      onCommitBlocked?.("too_long");
      return;
    }
    if (tags.includes(t)) {
      setDraft("");
      onClearError();
      return;
    }
    if (tags.length >= MAX_VIDEO_TAGS) {
      onCommitBlocked?.("max_tags");
      return;
    }
    setTags([...tags, t]);
    setDraft("");
    onClearError();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    stopPlayerHotkeys(e);
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      tryCommit();
      return;
    }
    if (e.key === "Tab" && draft.trim()) {
      e.preventDefault();
      tryCommit();
      return;
    }
    if (e.key === "Backspace" && draft === "") {
      e.preventDefault();
      setTags((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
      onClearError();
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={clsx(
          "flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 transition focus-within:border-cyan-400/55",
          error ? "border-rose-400/40" : null,
        )}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-cyan-400/25 bg-cyan-500/15 pl-2.5 pr-1 py-0.5 text-xs font-medium text-cyan-100"
          >
            <span className="truncate">#{t}</span>
            <button
              type="button"
              className="grid size-6 shrink-0 place-items-center rounded-full text-cyan-200/90 transition hover:bg-white/10 hover:text-white"
              aria-label={`Удалить тег ${t}`}
              onClick={() => {
                setTags((prev) => prev.filter((x) => x !== t));
                onClearError();
              }}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onClearError();
          }}
          onKeyDown={onKeyDown}
          onKeyDownCapture={stopPlayerHotkeys}
          onBlur={() => {
            if (draft.trim()) tryCommit();
          }}
          className="min-w-[6rem] flex-1 bg-transparent px-1 py-1 text-sm text-slate-100 outline-none placeholder:text-slate-500"
          placeholder={tags.length === 0 ? "тег и Enter" : "ещё тег…"}
          autoComplete="off"
          aria-label="Добавление тегов"
        />
      </div>
      <span className="text-[11px] leading-snug text-slate-500">
        До {MAX_VIDEO_TAGS} тегов, до {MAX_VIDEO_TAG_LEN} символов. Enter, Tab или запятая — добавить тег; # необязателен.
      </span>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}

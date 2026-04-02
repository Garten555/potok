"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Search, History, Sparkles } from "lucide-react";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { clearSearchHistory, getSearchHistory, pushSearchHistory } from "@/lib/search-history";

type SuggestionChannel = {
  type: "channel";
  id: string;
  channel_name: string;
  channel_handle: string | null;
  avatar_url: string | null;
  matchScore: number;
};

export type SmartSearchProps = {
  /** compact — строка в шапке; overlay — полноэкранный слой (мобильный) */
  variant?: "compact" | "overlay";
  /** После перехода по результату / Enter */
  onClose?: () => void;
  /** overlay: элемент слева от поля (например стрелка «назад») */
  leading?: ReactNode;
};

export function SmartSearch({ variant = "compact", onClose, leading }: SmartSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionChannel[]>([]);
  const [phraseHints, setPhraseHints] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeFetchId = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minChars = 2;
  const isOverlay = variant === "overlay";

  const refreshHistory = () => setSearchHistory(getSearchHistory());

  /** Строка в шапке совпадает с адресом /search?q=… */
  useEffect(() => {
    if (pathname !== "/search") return;
    setQuery(urlQuery ?? "");
  }, [pathname, urlQuery]);

  const handleInputFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocused(true);
    refreshHistory();
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    blurTimerRef.current = setTimeout(() => setFocused(false), 160);
  };

  useEffect(() => {
    if (isOverlay) return;
    const onPointerDown = (event: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isOverlay]);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < minChars) {
      setSuggestions([]);
      setPhraseHints([]);
      setIsLoading(false);
      return;
    }

    const fetchId = ++activeFetchId.current;
    setIsOpen(true);
    setSuggestions([]);
    setPhraseHints([]);
    setIsLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/search/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q, history: getSearchHistory() }),
        });
        const data = (await res.json()) as { channels?: SuggestionChannel[]; phrases?: string[] };

        if (fetchId !== activeFetchId.current) return;
        if (!res.ok) {
          setSuggestions([]);
          setPhraseHints([]);
        } else {
          setSuggestions(Array.isArray(data.channels) ? data.channels : []);
          setPhraseHints(Array.isArray(data.phrases) ? data.phrases : []);
        }
        setIsOpen(true);
      } catch {
        if (fetchId !== activeFetchId.current) return;
        setSuggestions([]);
        setPhraseHints([]);
        setIsOpen(true);
      } finally {
        if (fetchId !== activeFetchId.current) return;
        setIsLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const submit = (q: string) => {
    const cleaned = q.trim();
    if (!cleaned) return;
    pushSearchHistory(cleaned);
    refreshHistory();
    setIsOpen(false);
    onClose?.();
    router.push(`/search?q=${encodeURIComponent(cleaned)}`);
  };

  const onPickChannel = (s: SuggestionChannel) => {
    const typed = query.trim();
    if (typed.length >= 2) pushSearchHistory(typed);
    refreshHistory();
    setIsOpen(false);
    onClose?.();
    if (s.channel_handle) router.push(`/@${s.channel_handle}`);
    else router.push("/");
  };

  const trimmed = query.trim();
  const showHistoryPanel = focused && trimmed.length < minChars && searchHistory.length > 0;
  const showShortHint = focused && trimmed.length > 0 && trimmed.length < minChars;
  const showEmptyHint = focused && trimmed.length === 0 && searchHistory.length === 0;

  const historySection = (compact: boolean) => (
    <div className="space-y-2">
      <div className={clsx("flex items-center justify-between", compact ? "px-1 pt-0.5" : "px-2 pt-1")}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Недавние</span>
        <button
          type="button"
          className="text-[11px] text-cyan-300/90 transition hover:underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            clearSearchHistory();
            setSearchHistory([]);
          }}
        >
          Очистить
        </button>
      </div>
      <div className="space-y-1">
        {searchHistory.map((h) => (
          <button
            key={h}
            type="button"
            className={clsx(
              "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]",
              compact ? "px-3 py-2" : "gap-3 px-3 py-3",
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => submit(h)}
          >
            <History className={clsx("shrink-0 text-slate-500", compact ? "h-4 w-4" : "h-5 w-5")} />
            <span className={clsx("min-w-0 truncate text-slate-200", compact ? "text-xs" : "text-sm")}>{h}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const channelRow = (s: SuggestionChannel, compact: boolean, onActivate: () => void) => (
    <button
      key={`c-${s.id}`}
      type="button"
      className={clsx(
        "flex w-full items-center rounded-xl border border-white/10 bg-white/[0.02] text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]",
        compact ? "gap-2 px-3 py-2" : "gap-3 px-3 py-3",
      )}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onActivate}
    >
      <ChannelAvatar
        channelName={s.channel_name}
        avatarUrl={s.avatar_url}
        variant="video"
        className={compact ? "!h-8 !w-8 !min-h-0 !min-w-0 !text-[11px] sm:!h-8 sm:!w-8" : "!h-10 !w-10 !text-sm sm:!h-10 sm:!w-10"}
      />
      <div className="min-w-0 flex-1">
        <div className={clsx("line-clamp-1 font-medium text-slate-100", compact ? "text-xs" : "text-sm")}>
          {s.channel_name}
        </div>
        <div className={clsx("line-clamp-1 text-slate-400", compact ? "text-[11px]" : "text-xs")}>
          {s.channel_handle ? `@${s.channel_handle}` : "Канал"}
        </div>
      </div>
    </button>
  );

  const hintsStrip = (compact: boolean) =>
    phraseHints.length > 0 && trimmed.length >= minChars ? (
      <div className={clsx("mb-2 space-y-1.5", compact && "px-0.5")}>
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          <Sparkles className="h-3 w-3 shrink-0 text-cyan-300/70" />
          Похожие запросы
        </div>
        <div className="flex flex-wrap gap-1.5">
          {phraseHints.map((hint) => (
            <button
              key={hint}
              type="button"
              className="max-w-full truncate rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-left text-xs text-cyan-100/95 transition hover:bg-cyan-500/20"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(hint)}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const suggestionsList = (compact: boolean) => (
    <div className="space-y-1">
      {suggestions.map((s) => channelRow(s, compact, () => onPickChannel(s)))}
    </div>
  );

  const searchSubmitButton = (compact: boolean) => (
    <button
      type="button"
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-white/[0.03] text-left text-slate-200 transition hover:bg-white/[0.06]",
        compact ? "px-3 py-2.5 text-xs" : "px-3 py-3 text-sm",
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        submit(query);
      }}
    >
      Искать: <span className="text-cyan-200">{trimmed}</span>
    </button>
  );

  const overlayTypedBlock =
    trimmed.length >= minChars && !isLoading ? (
      <div className="px-1">
        {hintsStrip(false)}
        {suggestions.length > 0 ? (
          <div className="mt-1 space-y-1.5">
            <p className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Каналы</p>
            {suggestionsList(false)}
          </div>
        ) : null}
        <div className={clsx(suggestions.length > 0 || phraseHints.length > 0 ? "mt-2" : "")}>{searchSubmitButton(false)}</div>
      </div>
    ) : null;

  const resultsBody = isLoading && trimmed.length >= minChars ? (
    <div className="px-3 py-6 text-center text-sm text-slate-400">Ищем...</div>
  ) : showHistoryPanel ? (
    historySection(false)
  ) : showShortHint ? (
    <p className="px-3 py-6 text-center text-sm text-slate-500">
      Введите ещё {minChars - trimmed.length} символ…
    </p>
  ) : showEmptyHint ? (
    <p className="px-3 py-6 text-center text-sm text-slate-500">
      Недавние запросы появятся после поиска. Начните вводить — покажем каналы и подсказки.
    </p>
  ) : trimmed.length >= minChars ? (
    overlayTypedBlock
  ) : (
    <p className="px-3 py-6 text-center text-sm text-slate-500">Начните вводить запрос — покажем каналы и дополнения.</p>
  );

  const compactDropdownInner = () => {
    if (isLoading && trimmed.length >= minChars) {
      return <div className="px-3 py-2 text-xs text-slate-400">Ищем...</div>;
    }
    if (showHistoryPanel) return <div className="p-1">{historySection(true)}</div>;
    if (showShortHint) {
      return (
        <div className="px-3 py-4 text-center text-xs text-slate-500">
          Введите ещё {minChars - trimmed.length} символ…
        </div>
      );
    }
    if (showEmptyHint) {
      return (
        <div className="px-3 py-4 text-center text-xs text-slate-500">
          Недавние запросы сохраняются здесь. Введите запрос из 2+ символов.
        </div>
      );
    }
    if (trimmed.length >= minChars && !isLoading) {
      return (
        <div className="space-y-1 p-1">
          {hintsStrip(true)}
          {suggestions.length > 0 ? (
            <div className="space-y-1">
              <p className="px-0.5 pt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Каналы</p>
              {suggestionsList(true)}
            </div>
          ) : null}
          <div className={clsx(phraseHints.length > 0 || suggestions.length > 0 ? "pt-1" : "")}>
            {searchSubmitButton(true)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        "min-w-0 w-full",
        isOverlay ? "flex min-h-0 flex-1 flex-col" : "relative max-w-2xl",
      )}
    >
      {isOverlay ? (
        <div className="flex w-full items-center gap-2">
          {leading ? <span className="shrink-0">{leading}</span> : null}
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-400">
            <Search className="h-5 w-5 shrink-0 opacity-70" />
            <input
              className="w-full min-w-0 bg-transparent text-left text-base text-slate-200 outline-none placeholder:text-slate-500"
              placeholder="Поиск по видео и каналам"
              type="search"
              autoFocus={isOverlay}
              autoComplete="off"
              aria-label="Поиск по видео и каналам"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit(query);
                if (e.key === "Escape") {
                  setIsOpen(false);
                  onClose?.();
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className={clsx(
            "flex h-9 w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-slate-400",
          )}
        >
          <Search className="h-4 w-4 shrink-0 opacity-70" />
          <input
            className="w-full min-w-0 bg-transparent text-left text-xs text-slate-200 outline-none placeholder:text-slate-500"
            placeholder="Поиск"
            type="search"
            aria-label="Поиск по видео и каналам"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(query);
              if (e.key === "Escape") setIsOpen(false);
            }}
          />
        </div>
      )}

      {isOverlay ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-white/8 bg-[#0c101c]/80 p-2">
            {resultsBody}
          </div>
          <p className="mt-3 px-1 text-center text-[11px] text-slate-500">
            Enter — все результаты на отдельной странице
          </p>
        </div>
      ) : isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1628]/95 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="max-h-[360px] overflow-auto p-2">{compactDropdownInner()}</div>

          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-slate-400">
            Нажмите <span className="text-slate-200">Enter</span> для страницы результатов.
          </div>
        </div>
      ) : null}
    </div>
  );
}

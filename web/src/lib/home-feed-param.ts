/**
 * Главная страница `/`: короткий query `f` + один символ (whitelist).
 * Старые `?tab=` (search, history, subscriptions, favorites, trending) по-прежнему обрабатываются.
 *
 * | `f` | Действие |
 * |-----|----------|
 * | `s` + `q` | редирект на `/search?q=…` |
 * | `h` | редирект на `/history` |
 * | `u` | редирект на `/subscriptions` |
 * | `l` | редирект на `/favorites` |
 * | `t` | лента «Недавно опубликованные», затем чистый `/` |
 */

export const HOME_FEED_QUERY_KEY = "f" as const;

const LEGACY_TAB_TO_CODE: Record<string, string> = {
  search: "s",
  history: "h",
  subscriptions: "u",
  favorites: "l",
  trending: "t",
};

function normalizeParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() : undefined;
}

const VALID_F = new Set(["s", "h", "u", "l", "t"]);

/** Код из `f` или устаревшего `tab` (только известные значения tab). */
export function homeFeedCodeFromParams(params: {
  f?: string | string[];
  tab?: string | string[];
}): string | null {
  const fRaw = normalizeParam(params.f);
  if (fRaw && fRaw.length === 1 && VALID_F.has(fRaw)) {
    return fRaw;
  }
  const tab = normalizeParam(params.tab);
  if (tab && LEGACY_TAB_TO_CODE[tab]) {
    return LEGACY_TAB_TO_CODE[tab] ?? null;
  }
  return null;
}

export function homeTrendingHref(): string {
  return `/?${HOME_FEED_QUERY_KEY}=t`;
}

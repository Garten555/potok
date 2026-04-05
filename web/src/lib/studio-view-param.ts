/**
 * Раздел студии в URL: короткий параметр `v` + один символ (whitelist).
 * Произвольные значения не используются в разметке — только сопоставление с известными разделами
 * (снижает «палево» имён разделов и исключает отражение неизвестных строк из query в UI).
 */

export type StudioNav = "upload" | "content" | "playlists" | "stats" | "channel_home" | "incoming_reports";

export const STUDIO_VIEW_QUERY_KEY = "v" as const;

const NAV_TO_CODE: Record<StudioNav, string> = {
  upload: "u",
  content: "c",
  playlists: "p",
  stats: "s",
  channel_home: "h",
  incoming_reports: "r",
};

const CODE_TO_NAV = Object.fromEntries(
  Object.entries(NAV_TO_CODE).map(([nav, code]) => [code, nav as StudioNav]),
) as Record<string, StudioNav>;

const LEGACY_TAB_TO_NAV: Record<string, StudioNav> = {
  upload: "upload",
  content: "content",
  playlists: "playlists",
  stats: "stats",
  "channel-home": "channel_home",
  "incoming-reports": "incoming_reports",
};

export function studioPathForNav(nav: StudioNav): string {
  return `/studio?${STUDIO_VIEW_QUERY_KEY}=${NAV_TO_CODE[nav]}`;
}

export function isStudioViewCodeValid(code: string): boolean {
  return code.length === 1 && Boolean(CODE_TO_NAV[code]);
}

/** Разбор из query: сначала `v`, иначе устаревший `tab` (для старых закладок). */
export function parseStudioNavFromSearchParams(sp: URLSearchParams): StudioNav | null {
  const code = sp.get(STUDIO_VIEW_QUERY_KEY)?.trim();
  if (code && isStudioViewCodeValid(code)) {
    return CODE_TO_NAV[code] ?? null;
  }
  const tab = sp.get("tab")?.trim();
  if (!tab) return null;
  return LEGACY_TAB_TO_NAV[tab] ?? null;
}

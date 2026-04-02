const STORAGE_KEY = "potok_search_history_v1";
const MAX_ITEMS = 12;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const j = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(j)
      ? j.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

/** Сохраняет запрос в начало списка (без дубликатов по регистру). */
export function pushSearchHistory(query: string): void {
  const t = query.trim();
  if (t.length < 2) return;
  try {
    const prev = getSearchHistory().filter((x) => x.toLowerCase() !== t.toLowerCase());
    const next = [t, ...prev].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

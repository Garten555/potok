/** Общая логика релевантности для подсказок и страницы поиска. */

export function normalizeSearch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function extractTokens(q: string): string[] {
  return normalizeSearch(q)
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

/** Подпоследовательность символов (простая «опечаткоустойчивость»). */
export function isSubsequenceMatch(query: string, text: string): boolean {
  const q = normalizeSearch(query);
  const t = normalizeSearch(text);
  if (!q.length) return true;
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i++;
    if (i >= q.length) return true;
  }
  return false;
}

/**
 * Сила совпадения строки с запросом: точное > префикс > начало слова > вхождение > подпоследовательность.
 */
export function matchStrength(query: string, text: string): number {
  const q = normalizeSearch(query);
  const t = normalizeSearch(text);
  if (!q || !t) return 0;
  if (t === q) return 220;
  if (t.startsWith(q)) return 140;
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 105;
  if (t.includes(q)) return 62;
  if (isSubsequenceMatch(q, t)) return 32;
  return 0;
}

/** Сколько токенов из запроса встречается в тексте (нижний регистр). */
export function tokenHitsInText(text: string, tokens: string[]): number {
  const h = normalizeSearch(text);
  return tokens.reduce((n, tok) => n + (tok && h.includes(tok) ? 1 : 0), 0);
}

/** Бонус за свежесть: до maxPoints за видео не старше ~180 дней. */
export function recencyBoost(createdAt: string | null | undefined, maxPoints = 24): number {
  const ms = new Date(createdAt ?? 0).getTime();
  if (!Number.isFinite(ms)) return 0;
  const ageDays = (Date.now() - ms) / 864e5;
  if (ageDays < 0) return maxPoints;
  if (ageDays > 200) return 0;
  return Math.round(maxPoints * (1 - ageDays / 200));
}

/** Лог-подобный буст просмотров (сжимает хвост). */
export function viewsSoftBoost(views: number | null | undefined, cap = 18): number {
  const v = typeof views === "number" && views > 0 ? views : 0;
  if (v <= 0) return 0;
  return Math.min(cap, Math.round(Math.log10(v + 1) * 6));
}

export function channelHandleBoost(query: string, handle: string | null | undefined): number {
  const qn = normalizeSearch(query).replace(/^@/, "");
  const h = normalizeSearch(handle ?? "").replace(/^@/, "");
  if (!qn || !h) return 0;
  if (h === qn) return 520;
  if (h.startsWith(qn) || qn.startsWith(h)) return 240;
  if (h.includes(qn) || qn.includes(h)) return 95;
  return 0;
}

/**
 * Относительное время публикации для UI (главная, карточки): «5 минут назад», «2 месяца назад».
 * `nowMs` передаётся из state, чтобы подписи обновлялись при тике таймера.
 */
export function formatPublishedAgo(isoDate: string | null | undefined, nowMs: number): string {
  if (!isoDate) return "";
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return "";

  const diffMs = nowMs - t;
  if (diffMs < 0) return "только что";

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "только что";

  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

  const min = Math.floor(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");

  const hr = Math.floor(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");

  const day = Math.floor(hr / 24);
  if (day < 7) return rtf.format(-day, "day");

  const week = Math.floor(day / 7);
  if (week < 5) return rtf.format(-week, "week");

  const month = Math.floor(day / 30);
  if (month < 12) return rtf.format(-month, "month");

  const year = Math.floor(day / 365);
  return rtf.format(-year, "year");
}

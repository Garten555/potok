/** Событие для мгновенного обновления ленты на главной (например после скрытия видео модератором). */
export const HOME_FEED_REFRESH_EVENT = "potok:home-feed-refresh";

export function dispatchHomeFeedRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HOME_FEED_REFRESH_EVENT));
}

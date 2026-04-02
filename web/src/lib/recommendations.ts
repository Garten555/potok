export type VideoRecInput = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  user_id: string;
  category_id?: string | null;
  views: number | null;
  created_at: string;
  like_count?: number;
};

export type RecContext = {
  now: number;
  subscribedChannelIds: Set<string>;
  likedVideoIds: Set<string>;
  watchedVideoIds: Set<string>;
};

/** Главная: эвристика по просмотрам, лайкам, свежести, подпискам и истории. */
export function scoreVideoForHome(v: VideoRecInput, ctx: RecContext): number {
  const views = Math.max(0, v.views ?? 0);
  const likes = Math.max(0, v.like_count ?? 0);
  const ageMs = ctx.now - new Date(v.created_at).getTime();
  const ageDays = ageMs / 86_400_000;
  const recency = Math.exp(-Math.min(Math.max(ageDays, 0), 45) / 10);
  const engagement = Math.log1p(views) * 2.2 + Math.log1p(likes) * 4.8;
  const sub = ctx.subscribedChannelIds.has(v.user_id) ? 130 : 0;
  const liked = ctx.likedVideoIds.has(v.id) ? 50 : 0;
  const watched = ctx.watchedVideoIds.has(v.id) ? 28 : 0;
  return engagement + recency * 38 + sub + liked + watched;
}

export type WatchRecCurrent = {
  videoId: string;
  authorId: string;
  categoryId: string | null;
};

/** Боковая панель «Следующее»: ближе категория и автор, плюс общие сигналы. */
export function scoreVideoForWatchSidebar(v: VideoRecInput, current: WatchRecCurrent, ctx: RecContext): number {
  let s = scoreVideoForHome(v, ctx);
  if (v.id === current.videoId) return -1e9;
  if (v.category_id && current.categoryId && v.category_id === current.categoryId) s += 55;
  if (v.user_id === current.authorId) s += 22;
  return s;
}

/** Скрывать канал/видео от зрителей (не от владельца): заморозка аккаунта или модерация. */
export function isChannelHiddenFromPublic(row: {
  account_frozen_at?: string | null;
  moderation_soft_freeze_at?: string | null;
  moderation_hard_freeze_until?: string | null;
}): boolean {
  if (row.account_frozen_at) return true;
  if (row.moderation_soft_freeze_at) return true;
  const h = row.moderation_hard_freeze_until;
  if (h && new Date(h).getTime() > Date.now()) return true;
  return false;
}

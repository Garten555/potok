/** Текст предупреждения в студии по полям штрафов (клиент). */
export function moderationStudioBannerText(row: {
  upload_banned_until?: string | null;
  moderation_soft_freeze_at?: string | null;
  moderation_hard_freeze_until?: string | null;
  moderation_no_appeal?: boolean | null;
}): string | null {
  const now = Date.now();
  const hardUntil = row.moderation_hard_freeze_until;
  const hard = hardUntil && new Date(hardUntil).getTime() > now;
  if (hard && row.moderation_no_appeal) {
    return `Канал заблокирован по решению модерации до ${new Date(hardUntil!).toLocaleDateString("ru-RU")}. Обжалование этого срока недоступно.`;
  }
  if (hard) {
    return `Действует долгая блокировка канала до ${new Date(hardUntil!).toLocaleDateString("ru-RU")}.`;
  }
  if (row.moderation_soft_freeze_at) {
    return "Канал скрыт от зрителей из‑за жалоб; подписчики сохраняются. Подробности — в правилах и на почте.";
  }
  const ub = row.upload_banned_until;
  if (ub && new Date(ub).getTime() > now) {
    return `Загрузка новых видео ограничена до ${new Date(ub).toLocaleString("ru-RU")}.`;
  }
  return null;
}

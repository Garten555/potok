/** Событие: обновить счётчик/список уведомлений (без настроек в БД Supabase). */
export const USER_NOTIFICATIONS_EVENT = "notifications:refresh";

/** Событие: смена роли пользователя (payload: { role: string }) — без polling. */
export const USER_SESSION_ROLE_EVENT = "session:role";

export function userNotificationsChannelName(userId: string): string {
  return `user-notifications-${userId}`;
}

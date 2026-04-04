/**
 * Сообщить получателю по Pusher обновить уведомления (после ответа на комментарий и т.п.).
 */
export async function triggerUserNotificationChannel(targetUserId: string): Promise<void> {
  await fetch("/api/realtime/pusher/user-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ targetUserId }),
  }).catch(() => {
    /* не блокируем UI */
  });
}

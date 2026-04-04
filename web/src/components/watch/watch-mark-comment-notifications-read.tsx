"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { dispatchNotificationsRefresh } from "@/lib/notifications-events";

/**
 * При просмотре ролика помечаем непрочитанные уведомления «ответ на комментарий» по этому видео как прочитанные.
 */
export function WatchMarkCommentNotificationsRead({ videoId }: { videoId: string }) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false)
        .eq("type", "comment_reply")
        .filter("data->>videoId", "eq", videoId);

      if (!error && !cancelled) {
        dispatchNotificationsRefresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return null;
}

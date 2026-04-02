"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SubscribeButtonProps = {
  channelId: string;
  viewerId?: string;
  initiallySubscribed: boolean;
};

export function SubscribeButton({ channelId, viewerId, initiallySubscribed }: SubscribeButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(initiallySubscribed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isSelf = Boolean(viewerId) && viewerId === channelId;

  const toggleSubscription = async () => {
    if (!viewerId) {
      window.location.href = "/auth";
      return;
    }
    if (isSelf) {
      setError("Нельзя подписаться на свой канал.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      if (isSubscribed) {
        const { error: deleteError } = await supabase
          .from("subscriptions")
          .delete()
          .eq("subscriber_id", viewerId)
          .eq("channel_id", channelId);
        if (deleteError) {
          setError("Не удалось отписаться.");
          return;
        }
        setIsSubscribed(false);
      } else {
        const { error: insertError } = await supabase
          .from("subscriptions")
          .upsert(
            { subscriber_id: viewerId, channel_id: channelId },
            { onConflict: "subscriber_id,channel_id" },
          );
        if (insertError) {
          setError("Не удалось подписаться.");
          return;
        }
        setIsSubscribed(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSelf) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggleSubscription}
        disabled={isSubmitting}
        className={clsx(
          "rounded-lg border px-3 py-2 text-xs font-medium transition sm:text-sm",
          isSubscribed
            ? "border-white/20 bg-white/10 text-slate-100 hover:bg-white/15"
            : "border-cyan-300/35 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30",
        )}
      >
        {isSubmitting ? "Подождите..." : isSubscribed ? "Вы подписаны" : "Подписаться"}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}

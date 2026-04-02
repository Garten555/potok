"use client";

import { useEffect, useMemo, useState } from "react";
import { createPusherClient } from "@/lib/pusher/client";

type WatchViewsProps = {
  videoId: string;
  initialViews: number;
};

export function WatchViews({ videoId, initialViews }: WatchViewsProps) {
  const pusher = useMemo(() => createPusherClient(), []);
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    const channel = pusher.subscribe(`video-${videoId}`);
    const handler = (data: unknown) => {
      const payload = typeof data === "object" && data ? (data as { videoId?: string; views?: number }) : {};
      if (payload.videoId && payload.videoId !== videoId) return;
      if (typeof payload.views === "number") setViews(payload.views);
    };

    channel.bind("views:updated", handler);

    return () => {
      channel.unbind("views:updated", handler);
      pusher.unsubscribe(`video-${videoId}`);
      pusher.disconnect();
    };
  }, [pusher, videoId]);

  return <>{views.toLocaleString("ru-RU")} просмотров</>;
}


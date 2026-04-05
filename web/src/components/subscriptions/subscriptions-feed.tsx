"use client";

import { useEffect, useMemo, useState } from "react";
import { Tv } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";
import { VideoGridCard } from "@/components/video/video-grid-card";
import { isChannelHiddenFromPublic } from "@/lib/moderation-visibility";

type VideoRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
  user_id: string;
};

type AuthorRow = {
  id: string;
  channel_name: string | null;
  avatar_url: string | null;
};

export function SubscriptionsFeed() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { isAuthenticated } = useAuthState();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [authors, setAuthors] = useState<Map<string, AuthorRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setVideos([]);
      setAuthors(new Map());
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u.user;
        if (!user) {
          setVideos([]);
          setAuthors(new Map());
          return;
        }

        const { data: subRows } = await supabase
          .from("subscriptions")
          .select("channel_id")
          .eq("subscriber_id", user.id);

        const channelIds = Array.from(
          new Set((subRows ?? []).map((r) => String((r as { channel_id: string }).channel_id))),
        );

        if (channelIds.length === 0) {
          if (!cancelled) {
            setVideos([]);
            setAuthors(new Map());
          }
          return;
        }

        const { data: vids, error: vErr } = await supabase
          .from("videos")
          .select("id, title, thumbnail_url, views, created_at, user_id, visibility")
          .in("user_id", channelIds)
          .in("visibility", ["public", "unlisted"])
          .order("created_at", { ascending: false })
          .limit(80);

        if (vErr || cancelled) return;

        let list = (vids ?? []) as VideoRow[];
        const authorIds = Array.from(new Set(list.map((v) => v.user_id).filter(Boolean)));
        if (authorIds.length > 0) {
          const { data: penaltyRows, error: penErr } = await supabase
            .from("users")
            .select("id, account_frozen_at, moderation_soft_freeze_at, moderation_hard_freeze_until")
            .in("id", authorIds);
          if (!penErr && penaltyRows) {
            const hidden = new Set<string>();
            for (const row of penaltyRows as Array<{
              id: string;
              account_frozen_at?: string | null;
              moderation_soft_freeze_at?: string | null;
              moderation_hard_freeze_until?: string | null;
            }>) {
              if (isChannelHiddenFromPublic(row)) hidden.add(String(row.id));
            }
            if (hidden.size > 0) list = list.filter((v) => !hidden.has(v.user_id));
          }
        }

        const { data: usersRaw } = await supabase
          .from("users")
          .select("id, channel_name, avatar_url")
          .in("id", Array.from(new Set(list.map((v) => v.user_id))));

        if (cancelled) return;
        setVideos(list);
        setAuthors(
          new Map(
            ((usersRaw ?? []) as AuthorRow[]).map((a) => [
              String(a.id),
              { id: String(a.id), channel_name: a.channel_name, avatar_url: a.avatar_url },
            ]),
          ),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, supabase]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 md:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
          <Tv className="h-4 w-4 text-cyan-200" />
          Подписки
        </h2>
        <p className="mt-1 text-sm text-slate-400">Новые видео с каналов, на которые вы подписаны</p>
      </div>

      {!isAuthenticated ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Войдите, чтобы видеть ленту подписок.
          </div>
        </section>
      ) : loading ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">Загрузка...</div>
        </section>
      ) : videos.length === 0 ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Пока нет контента: подпишитесь на каналы — их новые ролики появятся здесь.
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-6 w-full min-w-0 max-w-[1920px] px-3 sm:px-4 md:px-5 lg:px-6">
          <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-4 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => {
              const meta = authors.get(String(video.user_id));
              return (
                <VideoGridCard
                  key={video.id}
                  layout="home"
                  videoId={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnail_url}
                  views={video.views}
                  createdAt={video.created_at}
                  channelName={meta?.channel_name?.trim() || "Канал"}
                  avatarUrl={meta?.avatar_url ?? null}
                  nowMs={now}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

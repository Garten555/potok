"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CommunityPost = {
  id: string;
  content: string;
  created_at: string;
};

type CommunityTabProps = {
  channelId: string;
  isOwner: boolean;
  subscribersCount: number;
};

export function CommunityTab({ channelId, isOwner, subscribersCount }: CommunityTabProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const canPublish = isOwner && subscribersCount >= 2;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("community_posts")
        .select("id, content, created_at")
        .eq("user_id", channelId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      setItems((data ?? []) as CommunityPost[]);
      setIsLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [channelId, supabase]);

  const onPublish = async () => {
    if (!canPublish) return;
    const normalized = content.trim();
    if (!normalized) {
      setError("Введите текст поста.");
      return;
    }
    if (normalized.length > 1000) {
      setError("Пост слишком длинный (максимум 1000 символов).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("community_posts")
      .insert({ user_id: channelId, content: normalized })
      .select("id, content, created_at")
      .single();
    setIsSubmitting(false);

    if (insertError || !data) {
      setError("Не удалось опубликовать пост.");
      return;
    }
    setItems((prev) => [data as CommunityPost, ...prev]);
    setContent("");
  };

  const onDelete = async (id: string) => {
    const { error: deleteError } = await supabase.from("community_posts").delete().eq("id", id).eq("user_id", channelId);
    if (deleteError) {
      setError("Не удалось удалить пост.");
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="mt-6 space-y-4">
      {isOwner ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-base font-semibold text-slate-100">Новый пост</h3>
          {subscribersCount < 2 ? (
            <p className="mt-2 text-sm text-amber-200/90">
              Сообщество откроется после 2 подписчиков. Сейчас: {subscribersCount}.
            </p>
          ) : null}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Что нового на канале?"
            rows={4}
            disabled={!canPublish || isSubmitting}
            className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55 disabled:opacity-60"
          />
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onPublish}
              disabled={!canPublish || isSubmitting}
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {isSubmitting ? "Публикация..." : "Опубликовать"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-400">Загрузка постов...</p>
        ) : items.length > 0 ? (
          items.map((post) => (
            <article key={post.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{post.content}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <time className="text-xs text-slate-500">
                  {new Date(post.created_at).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="inline-flex items-center gap-1 rounded border border-rose-400/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
            В сообществе пока нет постов.
          </p>
        )}
      </section>
    </div>
  );
}

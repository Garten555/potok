"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPusherClient } from "@/lib/pusher/client";
import { triggerPusherEvent } from "@/lib/pusher/trigger";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { ReportDialog } from "@/components/report/report-dialog";
import { Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  users?:
    | { channel_name?: string | null; avatar_url?: string | null }
    | Array<{ channel_name?: string | null; avatar_url?: string | null }>
    | null;
};

type CommentsSectionProps = {
  videoId: string;
  videoOwnerId: string;
  viewerId: string | null;
};

export function CommentsSection({ videoId, videoOwnerId, viewerId }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [hearts, setHearts] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  /** Сервер уже знает сессию (viewerId); клиентский getUser иногда отстаёт — не прячем форму. */
  const [isAuth, setIsAuth] = useState(() => Boolean(viewerId));
  const pusher = useMemo(() => createPusherClient(), []);

  const isStaff = viewerRole === "moderator" || viewerRole === "admin";
  const isOwner = Boolean(viewerId && viewerId === videoOwnerId);
  /** Вложенность ответов (0 = корень). */
  const MAX_REPLY_DEPTH = 6;

  const loadComments = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    // user_id FK points at auth.users, not public.users — embedding users!… often fails in PostgREST.
    const { data: rows, error: commentsErr } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (commentsErr) {
      if (process.env.NODE_ENV === "development") {
        console.error("[comments] load failed", commentsErr);
      }
      setLoadError("Не удалось загрузить комментарии.");
      setComments([]);
    } else {
      setLoadError("");
      const list = rows ?? [];
      const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))];
      const userMap = new Map<string, { channel_name?: string | null; avatar_url?: string | null }>();
      if (userIds.length > 0) {
        const { data: userRows, error: usersErr } = await supabase
          .from("users")
          .select("id, channel_name, avatar_url")
          .in("id", userIds);
        if (!usersErr && userRows) {
          for (const u of userRows as {
            id: string;
            channel_name?: string | null;
            avatar_url?: string | null;
          }[]) {
            userMap.set(u.id, u);
          }
        }
      }
      const merged: CommentRow[] = list.map((c) => ({
        ...(c as CommentRow),
        users: userMap.get(c.user_id) ?? null,
      }));
      setComments(merged);
    }

    const { data: heartRows, error: heartErr } = await supabase
      .from("comment_author_hearts")
      .select("comment_id")
      .eq("video_owner_id", videoOwnerId);
    if (!heartErr && heartRows) {
      setHearts(new Set((heartRows as { comment_id: string }[]).map((r) => String(r.comment_id))));
    } else {
      setHearts(new Set());
    }
  }, [videoId, videoOwnerId]);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      await Promise.all([
        loadComments(),
        (async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user?.id ?? null;
          setIsAuth(Boolean(uid) || Boolean(viewerId));
          if (uid) {
            const { data: prof } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
            setViewerRole((prof as { role?: string } | null)?.role ?? "user");
          } else {
            setViewerRole(null);
          }
        })(),
      ]);
    };
    void init();
  }, [videoId, loadComments, viewerId]);

  const grouped = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const replies = comments.filter((c) => c.parent_id);
    const byParent = new Map<string, CommentRow[]>();
    for (const r of replies) {
      const pid = r.parent_id as string;
      const arr = byParent.get(pid) ?? [];
      arr.push(r);
      byParent.set(pid, arr);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { roots, byParent };
  }, [comments]);

  const onSend = async () => {
    const normalized = text.trim();
    if (!normalized) {
      setError("Введите комментарий.");
      return;
    }
    if (normalized.length > 1500) {
      setError("Комментарий слишком длинный.");
      return;
    }

    try {
      setIsSending(true);
      setError("");
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setError("Войдите, чтобы оставить комментарий.");
        return;
      }

      const { error: insertError } = await supabase.from("comments").insert({
        video_id: videoId,
        user_id: user.id,
        content: normalized,
        parent_id: replyTo ?? null,
      });
      if (insertError) {
        setError(insertError.message.includes("banned") ? "Доступ ограничен." : "Не удалось отправить комментарий.");
        return;
      }

      setText("");
      setReplyTo(null);
      await loadComments();

      await triggerPusherEvent({
        channel: `video-${videoId}`,
        event: "comments:updated",
        payload: { videoId },
      });
    } finally {
      setIsSending(false);
    }
  };

  const onDelete = async (commentId: string) => {
    const supabase = createSupabaseBrowserClient();
    const { error: delErr } = await supabase.from("comments").delete().eq("id", commentId);
    if (delErr) {
      setError("Не удалось удалить. Если вы автор канала — проверьте, что в Supabase применена миграция 28_comments_rls_owner_delete.sql.");
      return;
    }
    if (replyTo === commentId) {
      setReplyTo(null);
      setText("");
    }
    if (editingId === commentId) {
      setEditingId(null);
      setEditText("");
    }
    await loadComments();
    await triggerPusherEvent({
      channel: `video-${videoId}`,
      event: "comments:updated",
      payload: { videoId },
    });
  };

  const onSaveEdit = async (commentId: string) => {
    const normalized = editText.trim();
    if (!normalized) {
      setError("Комментарий не может быть пустым.");
      return;
    }
    if (normalized.length > 1500) {
      setError("Комментарий слишком длинный.");
      return;
    }
    try {
      setIsSavingEdit(true);
      setError("");
      const supabase = createSupabaseBrowserClient();
      const { error: updErr } = await supabase.from("comments").update({ content: normalized }).eq("id", commentId);
      if (updErr) {
        setError("Не удалось сохранить изменения.");
        return;
      }
      setEditingId(null);
      setEditText("");
      await loadComments();
      await triggerPusherEvent({
        channel: `video-${videoId}`,
        event: "comments:updated",
        payload: { videoId },
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleHeart = async (commentId: string) => {
    if (!isOwner) return;
    const supabase = createSupabaseBrowserClient();
    const has = hearts.has(commentId);
    if (has) {
      await supabase
        .from("comment_author_hearts")
        .delete()
        .eq("comment_id", commentId)
        .eq("video_owner_id", videoOwnerId);
    } else {
      await supabase.from("comment_author_hearts").insert({ comment_id: commentId, video_owner_id: videoOwnerId });
    }
    await loadComments();
    await triggerPusherEvent({
      channel: `video-${videoId}`,
      event: "comments:updated",
      payload: { videoId },
    });
  };

  useEffect(() => {
    const channel = pusher.subscribe(`video-${videoId}`);
    const handler = (data: unknown) => {
      const payload = typeof data === "object" && data ? (data as { videoId?: string }) : {};
      if (payload.videoId && payload.videoId !== videoId) return;
      void loadComments();
    };
    channel.bind("comments:updated", handler);

    return () => {
      channel.unbind("comments:updated", handler);
      pusher.unsubscribe(`video-${videoId}`);
    };
  }, [pusher, videoId, loadComments]);

  const renderComment = (item: CommentRow, depth: number) => {
    const author = Array.isArray(item.users) ? item.users[0] : item.users;
    const canDelete =
      Boolean(viewerId) &&
      (viewerId === item.user_id || isOwner || isStaff);
    const canEditOwn = Boolean(viewerId && viewerId === item.user_id);
    const showHeart = isOwner;
    const showReport = Boolean(viewerId && viewerId !== item.user_id);
    const children = grouped.byParent.get(item.id) ?? [];
    const isEditing = editingId === item.id;
    const showReplyForm = isAuth && replyTo === item.id;

    return (
      <article
        key={item.id}
        className={clsx(
          "rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5",
          depth > 0 ? "ml-3 border-l border-cyan-400/25 sm:ml-6" : "",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 gap-2">
            <ChannelAvatar
              channelName={author?.channel_name ?? "Пользователь"}
              avatarUrl={author?.avatar_url}
              className="!h-9 !w-9 !text-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-cyan-200/90">{author?.channel_name ?? "Пользователь"}</p>
              {hearts.has(item.id) ? (
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-300/90">
                  Сердце автора
                </p>
              ) : null}
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{item.content}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString("ru-RU")}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {showHeart ? (
              <button
                type="button"
                onClick={() => void toggleHeart(item.id)}
                className={clsx(
                  "rounded-md border px-1.5 py-1 text-xs transition",
                  hearts.has(item.id)
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                    : "border-white/10 text-slate-400 hover:bg-white/[0.06]",
                )}
                title="Сердце автора"
              >
                <Heart className={clsx("h-3.5 w-3.5", hearts.has(item.id) ? "fill-rose-400 text-rose-200" : "")} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isAuth && depth < MAX_REPLY_DEPTH && !isEditing ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-cyan-200/90 hover:underline"
              onClick={() => {
                setReplyTo(item.id);
                setEditingId(null);
                setEditText("");
                setText("");
                setError("");
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Ответить
            </button>
          ) : null}
          {canEditOwn && !isEditing ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:underline"
              onClick={() => {
                setEditingId(item.id);
                setEditText(item.content);
                setReplyTo(null);
                setError("");
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Изменить
            </button>
          ) : null}
          {canEditOwn && isEditing ? (
            <>
              <button
                type="button"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1 text-xs text-cyan-200/90 hover:underline disabled:opacity-50"
                onClick={() => void onSaveEdit(item.id)}
              >
                Сохранить
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:underline"
                onClick={() => {
                  setEditingId(null);
                  setEditText("");
                }}
              >
                Отмена
              </button>
            </>
          ) : null}
          {showReport ? (
            <div className="scale-90">
              <ReportDialog targetType="comment" targetId={item.id} label="Жалоба" />
            </div>
          ) : null}
          {canDelete && !isEditing ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-rose-300/90 hover:underline"
              onClick={() => void onDelete(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </button>
          ) : null}
        </div>

        {showReplyForm ? (
          <div className="mt-3 space-y-2 rounded-lg border border-cyan-400/25 bg-cyan-950/25 px-3 py-2.5">
            <p className="text-xs text-cyan-100/90">Ваш ответ</p>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
              placeholder="Напишите ответ"
            />
            {error && replyTo === item.id ? <p className="text-xs text-rose-300">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={isSending}
                className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-1.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {isSending ? "Отправляем..." : "Отправить"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06]"
                onClick={() => {
                  setReplyTo(null);
                  setText("");
                  setError("");
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}

        {children.length > 0 ? (
          <div className="mt-3 space-y-2">
            {children.map((child) => renderComment(child, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-100">Комментарии</h2>
      {isAuth ? (
        !replyTo ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
              placeholder="Напишите комментарий"
            />
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={isSending}
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {isSending ? "Отправляем..." : "Отправить"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Ответ вводится в блоке под комментарием.{" "}
            <button
              type="button"
              className="text-cyan-300 underline"
              onClick={() => {
                setReplyTo(null);
                setText("");
                setError("");
              }}
            >
              Отменить ответ
            </button>
          </p>
        )
      ) : (
        <p className="mt-3 text-sm text-slate-400">Войдите, чтобы оставить комментарий.</p>
      )}

      {loadError ? <p className="mt-4 text-sm text-rose-300">{loadError}</p> : null}
      <div className="mt-4 space-y-3">
        {grouped.roots.length > 0 ? (
          grouped.roots.map((item) => renderComment(item, 0))
        ) : loadError ? null : (
          <p className="text-sm text-slate-400">Пока нет комментариев. Будьте первым.</p>
        )}
      </div>
    </section>
  );
}

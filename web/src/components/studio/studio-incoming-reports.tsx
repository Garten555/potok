"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { reportReasonLabel } from "@/lib/report-reasons";

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
};

const reportSelect = "id, target_type, target_id, reason_code, details, status, created_at, resolution_note";

type Tab = "all" | "video" | "comment" | "channel";

export function StudioIncomingReports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        return;
      }

      const { data: vrows, error: vErr } = await supabase.from("videos").select("id").eq("user_id", user.id);
      if (vErr) {
        setErr(vErr.message || "Не удалось загрузить видео.");
        setRows([]);
        return;
      }
      const vidIds = (vrows ?? []).map((v) => v.id as string);

      const merged: ReportRow[] = [];

      const { data: ch, error: chErr } = await supabase
        .from("reports")
        .select(reportSelect)
        .eq("target_type", "channel")
        .eq("target_id", user.id);
      if (chErr) {
        setErr(chErr.message || "Не удалось загрузить жалобы.");
        setRows([]);
        return;
      }
      merged.push(...((ch ?? []) as ReportRow[]));

      if (vidIds.length > 0) {
        const { data: vr, error: vrErr } = await supabase
          .from("reports")
          .select(reportSelect)
          .eq("target_type", "video")
          .in("target_id", vidIds);
        if (vrErr) {
          setErr(vrErr.message || "Не удалось загрузить жалобы на видео.");
          setRows([]);
          return;
        }
        if (vr?.length) merged.push(...(vr as ReportRow[]));

        const { data: crows } = await supabase.from("comments").select("id").in("video_id", vidIds);
        const cids = (crows ?? []).map((c) => c.id as string);
        if (cids.length > 0) {
          const { data: cr, error: crErr } = await supabase
            .from("reports")
            .select(reportSelect)
            .eq("target_type", "comment")
            .in("target_id", cids);
          if (crErr) {
            setErr(crErr.message || "Не удалось загрузить жалобы на комментарии.");
            setRows([]);
            return;
          }
          if (cr?.length) merged.push(...(cr as ReportRow[]));
        }
      }

      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const seen = new Set<string>();
      const dedup = merged.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      setRows(dedup);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.target_type === tab);
  }, [rows, tab]);

  const hideVideo = async (videoId: string) => {
    setActionId(videoId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("videos").update({ visibility: "private" }).eq("id", videoId);
      if (!error) await load();
    } finally {
      setActionId(null);
    }
  };

  const deleteComment = async (commentId: string) => {
    setActionId(commentId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (!error) await load();
    } finally {
      setActionId(null);
    }
  };

  const label = (t: string) =>
    t === "video" ? "Видео" : t === "comment" ? "Комментарий" : t === "channel" ? "Канал" : t;

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "video", label: "Видео" },
    { id: "comment", label: "Комментарии" },
    { id: "channel", label: "Сообщество" },
  ];

  if (loading) {
    return <p className="text-sm text-slate-400">Загрузка…</p>;
  }

  return (
    <section className="mx-auto w-full max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">Жалобы на мой контент</h1>
        <p className="mt-1 text-sm text-slate-400">
          Жалобы на ваш канал, ролики и комментарии под вашими видео. Вы можете скрыть своё видео или удалить комментарий
          на своей площадке; финальный разбор глобальных правил — у команды платформы в панели управления.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/35"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{err}</p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400">
          Пока нет жалоб в этой категории.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white/10 bg-[#0c1323]/80 px-4 py-3 text-sm text-slate-300"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-slate-100">{label(r.target_type)}</span>
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("ru-RU")}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{r.target_id}</p>
              <p className="mt-1 text-slate-400">
                Причина: {reportReasonLabel(r.reason_code)} · статус:{" "}
                <span className="text-slate-300">{r.status}</span>
              </p>
              {r.details ? <p className="mt-2 text-slate-400">{r.details}</p> : null}
              {r.resolution_note ? (
                <p className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-500">
                  Решение модерации: {r.resolution_note}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.target_type === "video" ? (
                  <>
                    <Link
                      href={`/watch/${r.target_id}`}
                      className="rounded-lg border border-white/15 px-2 py-1 text-xs text-cyan-200 hover:bg-white/5"
                    >
                      Открыть ролик
                    </Link>
                    <button
                      type="button"
                      disabled={actionId === r.target_id}
                      className="rounded-lg border border-amber-300/30 bg-amber-500/15 px-2 py-1 text-xs text-amber-100 disabled:opacity-50"
                      onClick={() => void hideVideo(r.target_id)}
                    >
                      Скрыть видео (приват)
                    </button>
                  </>
                ) : null}
                {r.target_type === "comment" ? (
                  <button
                    type="button"
                    disabled={actionId === r.target_id}
                    className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-2 py-1 text-xs text-rose-100 disabled:opacity-50"
                    onClick={() => void deleteComment(r.target_id)}
                  >
                    Удалить комментарий
                  </button>
                ) : null}
                {r.target_type === "channel" ? (
                  <p className="text-xs text-slate-500">
                    Жалоба на канал целиком — решают модераторы сайта; вы уже видите её для прозрачности.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

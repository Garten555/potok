"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { REPORT_REASON_CODES, reportReasonLabel } from "@/lib/report-reasons";
import clsx from "clsx";

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  moderator_action: string | null;
};

export default function AdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [boot, setBoot] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (reasonFilter) params.set("reason", reasonFilter);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/moderation/reports?${params.toString()}`);
      if (res.status === 403 || res.status === 401) {
        setAllowed(false);
        setReports([]);
        return;
      }
      const j = (await res.json()) as { reports?: ReportRow[] };
      setAllowed(true);
      setReports(j.reports ?? []);
    } catch {
      setAllowed(false);
    } finally {
      setLoading(false);
      setBoot(true);
    }
  }, [statusFilter, reasonFilter, q]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setAllowed(false);
    });
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    const res = await fetch(`/api/moderation/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        resolution_note: note || null,
        moderator_action: status === "resolved" ? "reviewed" : "dismiss",
      }),
    });
    if (res.ok) {
      setNote("");
      await load();
    }
  };

  const banFromReport = async (r: ReportRow) => {
    const uid = window.prompt("UUID пользователя для бана (или вставьте из цели жалобы)");
    if (!uid) return;
    const until = window.prompt("Дата окончания бана ISO, напр. 2099-12-31T00:00:00.000Z");
    if (!until) return;
    const res = await fetch(`/api/moderation/reports/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        resolution_note: note || "Бан по жалобе",
        moderator_action: "ban_user",
        ban_user_id: uid,
        ban_reason_code: r.reason_code,
        banned_until: until,
      }),
    });
    if (res.ok) {
      setNote("");
      await load();
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) await load();
  };

  const hideVideo = async (videoId: string) => {
    const { error } = await supabase.from("videos").update({ visibility: "private" }).eq("id", videoId);
    if (!error) await load();
  };

  const filteredReasons = useMemo(() => REPORT_REASON_CODES, []);

  if (!boot) {
    return (
      <div>
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center text-slate-400">Загрузка...</main>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div>
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center text-slate-300">
          <p>Доступ только для модераторов и администраторов.</p>
          <Link href="/" className="mt-4 inline-block text-cyan-300 hover:underline">
            На главную
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-100">Модерация и жалобы</h1>
        <p className="mt-1 text-sm text-slate-400">
          Поиск по причине и тексту жалобы; действия — разбор, бан (по API), удаление комментария или скрытие видео.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-slate-500">Статус</label>
            <select
              className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Все</option>
              <option value="open">open</option>
              <option value="reviewing">reviewing</option>
              <option value="resolved">resolved</option>
              <option value="dismissed">dismissed</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Причина</label>
            <select
              className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="">Все</option>
              {filteredReasons.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-xs text-slate-500">Умный поиск (текст)</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-1.5 text-sm text-slate-100"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ключевые слова в причине / тексте..."
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
            onClick={() => void load()}
          >
            Обновить
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs text-slate-500">Заметка модератора (при закрытии жалобы)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="mt-8 text-slate-400">Загрузка...</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("ru-RU")}</span>
                    <p className="mt-1 font-medium text-slate-100">
                      {r.target_type} · <span className="text-cyan-200/90">{r.target_id}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Причина: {reportReasonLabel(r.reason_code)} ({r.status})
                    </p>
                    {r.details ? <p className="mt-2 text-slate-300">{r.details}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={clsx(
                        "rounded-lg border px-2 py-1 text-xs",
                        "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
                      )}
                      onClick={() => void resolve(r.id, "resolved")}
                    >
                      Закрыть (ок)
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
                      onClick={() => void resolve(r.id, "dismissed")}
                    >
                      Отклонить
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-2 py-1 text-xs text-rose-100"
                      onClick={() => void banFromReport(r)}
                    >
                      Бан по жалобе
                    </button>
                    {r.target_type === "comment" ? (
                      <button
                        type="button"
                        className="rounded-lg border border-amber-300/30 bg-amber-500/15 px-2 py-1 text-xs text-amber-100"
                        onClick={() => void deleteComment(r.target_id)}
                      >
                        Удалить комментарий
                      </button>
                    ) : null}
                    {r.target_type === "video" ? (
                      <button
                        type="button"
                        className="rounded-lg border border-amber-300/30 bg-amber-500/15 px-2 py-1 text-xs text-amber-100"
                        onClick={() => void hideVideo(r.target_id)}
                      >
                        Скрыть видео
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

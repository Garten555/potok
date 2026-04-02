"use client";

import { useCallback, useEffect, useState } from "react";
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

export function StudioIncomingReports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  if (loading) {
    return <p className="text-sm text-slate-400">Загрузка…</p>;
  }

  return (
    <section className="mx-auto w-full max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">Жалобы на мой контент</h1>
        <p className="mt-1 text-sm text-slate-400">
          Жалобы пользователей на ваш канал, видео и комментарии под вашими роликами. Разбор ведут модераторы (раздел
          модерации для команды сайта).
        </p>
      </div>

      {err ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{err}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400">
          Пока нет жалоб на ваш контент.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white/10 bg-[#0c1323]/80 px-4 py-3 text-sm text-slate-300"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-slate-100">
                  {r.target_type === "video"
                    ? "Видео"
                    : r.target_type === "channel"
                      ? "Канал"
                      : r.target_type === "comment"
                        ? "Комментарий"
                        : r.target_type}
                </span>
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("ru-RU")}</span>
              </div>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

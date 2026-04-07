"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { REPORT_REASON_CODES, reportReasonLabel } from "@/lib/report-reasons";
import { reportStatusLabelRu } from "@/lib/report-status";
import type {
  ModerationReportRow,
  ModerationReportsListErrorBody,
  ModerationReportsListResponse,
} from "@/lib/moderation-reports-types";
import clsx from "clsx";
import { isAdminRole } from "@/lib/user-role";
import { dispatchHomeFeedRefresh } from "@/lib/home-feed-refresh";

export type ReportRow = ModerationReportRow;

export type AdminReportsSectionProps = {
  viewerRole: string | null;
};

export function AdminReportsSection({ viewerRole }: AdminReportsSectionProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [kindFilter, setKindFilter] = useState<"" | "video" | "comment" | "channel">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [banDialogReport, setBanDialogReport] = useState<ModerationReportRow | null>(null);
  const [banUntilIso, setBanUntilIso] = useState("2099-12-31T23:59:59.000Z");
  const [banUseManualUser, setBanUseManualUser] = useState(false);
  const [banManualUserInput, setBanManualUserInput] = useState("");
  const [banSubmitError, setBanSubmitError] = useState<string | null>(null);
  const [banSubmitting, setBanSubmitting] = useState(false);

  const loadReports = useCallback(
    async (channelOverride?: string, pageArg?: number) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      const ch = (channelOverride !== undefined ? channelOverride : channelFilter).trim();
      const pageNum = pageArg ?? page;
      if (ch) params.set("channel", ch);
      if (kindFilter) params.set("target_type", kindFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (reasonFilter) params.set("reason", reasonFilter);
      if (q.trim()) params.set("q", q.trim());
      params.set("page", String(pageNum));
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/moderation/reports?${params.toString()}`);
      const j = (await res.json()) as ModerationReportsListResponse | ModerationReportsListErrorBody;
      if (!res.ok) {
        setReports([]);
        setTotal(0);
        const errBody = j as ModerationReportsListErrorBody;
        setFetchError(errBody.error ?? `Ошибка ${res.status}`);
        return;
      }
      const ok = j as ModerationReportsListResponse;
      setReports(ok.reports ?? []);
      setTotal(typeof ok.total === "number" ? ok.total : ok.reports?.length ?? 0);
    } catch {
      setReports([]);
      setTotal(0);
      setFetchError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  },
    [kindFilter, statusFilter, reasonFilter, channelFilter, q, page, pageSize],
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

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
      await loadReports();
    }
  };

  const openBanDialog = (r: ModerationReportRow) => {
    setBanSubmitError(null);
    setBanUntilIso("2099-12-31T23:59:59.000Z");
    setBanUseManualUser(!r.ban_target_suggestion);
    setBanManualUserInput("");
    setBanDialogReport(r);
  };

  const closeBanDialog = () => {
    if (banSubmitting) return;
    setBanDialogReport(null);
    setBanSubmitError(null);
  };

  const submitBanFromDialog = async () => {
    const r = banDialogReport;
    if (!r) return;
    const suggested = r.ban_target_suggestion;
    const rawId =
      suggested && !banUseManualUser ? suggested.user_id : banManualUserInput.trim();
    if (!rawId) {
      setBanSubmitError("Укажите пользователя (@handle канала или UUID).");
      return;
    }
    setBanSubmitting(true);
    setBanSubmitError(null);
    try {
      const res = await fetch(`/api/moderation/reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolution_note: note || "Бан по жалобе",
          moderator_action: "ban_user",
          ban_user_id: rawId,
          ban_reason_code: r.reason_code,
          banned_until: banUntilIso.trim(),
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setBanSubmitError(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      setNote("");
      setBanDialogReport(null);
      await loadReports();
    } catch {
      setBanSubmitError("Сеть недоступна");
    } finally {
      setBanSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) await loadReports();
  };

  const hideVideo = async (videoId: string) => {
    const { error } = await supabase.from("videos").update({ visibility: "private" }).eq("id", videoId);
    if (!error) {
      await loadReports();
      dispatchHomeFeedRefresh();
    }
  };

  const filteredReasons = useMemo(() => REPORT_REASON_CODES, []);
  const isAdmin = isAdminRole(viewerRole);

  const kindTabs: { id: typeof kindFilter; label: string }[] = [
    { id: "", label: "Все" },
    { id: "video", label: "Видео" },
    { id: "comment", label: "Комментарии" },
    { id: "channel", label: "Сообщество (канал)" },
  ];

  const targetLabel = (t: string) =>
    t === "video" ? "Видео" : t === "comment" ? "Комментарий" : t === "channel" ? "Канал" : t;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-100">Жалобы</h1>
      <p className="mt-1 text-sm text-slate-400">
        Для жалоб на видео сначала откройте «Смотреть видео» в новой вкладке, затем принимайте решение. Очередь по видео,
        комментариям и каналам. Фильтр по каналу: укажите{" "}
        <strong className="text-slate-300">@handle</strong> или <strong className="text-slate-300">подстроку</strong> ника;
        при однозначном совпадении показываются связанные с каналом жалобы, в том числе на публикации и комментарии. При
        закрытии заявки можно добавить служебный комментарий. Блокировка пользователя по жалобе доступна администраторам.
      </p>

      <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
        <label className="text-xs font-medium uppercase tracking-wide text-cyan-200/85">
          Поиск канала: @handle или подстрока
        </label>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            placeholder="@handle или подстрока ника"
          />
          <button
            type="button"
            className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
            onClick={() => {
              setPage(1);
              void loadReports(undefined, 1);
            }}
          >
            Показать
          </button>
          {channelFilter.trim() ? (
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/5"
              onClick={() => {
                setChannelFilter("");
                setPage(1);
                void loadReports("", 1);
              }}
            >
              Сбросить канал
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {kindTabs.map((tab) => (
          <button
            key={tab.id || "all"}
            type="button"
            onClick={() => {
              setKindFilter(tab.id);
              setPage(1);
            }}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              kindFilter === tab.id
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/35"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-slate-500">Статус</label>
          <select
            className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Все</option>
            <option value="open">Открыта</option>
            <option value="reviewing">На рассмотрении</option>
            <option value="resolved">Закрыта</option>
            <option value="dismissed">Отклонена</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Причина</label>
          <select
            className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
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
          <label className="text-xs text-slate-500">Поиск по тексту</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-1.5 text-sm text-slate-100"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="ключевые слова…"
          />
        </div>
        <button
          type="button"
          className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
          onClick={() => void loadReports()}
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

      {fetchError ? <p className="mt-6 text-sm text-rose-300/90">{fetchError}</p> : null}

      {loading ? (
        <p className="mt-8 text-slate-400">Загрузка...</p>
      ) : (
        <>
        {reports.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">
            {channelFilter.trim()
              ? "Канал найден, жалоб по нему нет (или все отфильтрованы вкладками и полем «Поиск по тексту»)."
              : "Нет жалоб по выбранным фильтрам."}
          </p>
        ) : (
        <ul className="mt-8 space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("ru-RU")}</span>
                  <p className="mt-1 font-medium text-slate-100">
                    <span className="text-slate-400">{targetLabel(r.target_type)}</span>
                    {r.target_type === "comment" ? (
                      <>
                        {" "}
                        {r.moderation_context?.video_title ? (
                          <span className="font-normal text-slate-300">
                            · под видео «{r.moderation_context.video_title}»
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-normal text-cyan-200/85">
                            · id {r.target_id}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {" "}
                        <span className="font-mono text-sm text-cyan-200/90">{r.target_id}</span>
                      </>
                    )}
                  </p>
                  {r.target_type === "comment" ? (
                    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
                      {r.moderation_context?.parent_comment_snippet ? (
                        <p className="mb-2 border-l-2 border-amber-500/40 pl-2.5 text-xs leading-snug text-slate-400">
                          <span className="font-semibold text-amber-200/80">Ответ на:</span>{" "}
                          {r.moderation_context.parent_comment_snippet}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">
                        {r.moderation_context?.comment_content ??
                          "Текст не найден — комментарий мог быть удалён."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {r.moderation_context?.comment_author_display ? (
                          <span>
                            Автор:{" "}
                            <span className="text-slate-400">{r.moderation_context.comment_author_display}</span>
                          </span>
                        ) : (
                          <span>Автор: —</span>
                        )}
                        <span className="font-mono text-[10px] opacity-70">comment_id {r.target_id}</span>
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">
                    Причина: {reportReasonLabel(r.reason_code)} ({reportStatusLabelRu(r.status)})
                  </p>
                  {r.details ? (
                    <p className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-slate-300">
                      <span className="text-xs font-medium text-slate-500">Текст жалобы: </span>
                      {r.details}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.target_type === "video" ? (
                    <Link
                      href={`/watch/${encodeURIComponent(r.target_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-100 transition hover:bg-sky-500/25"
                    >
                      Смотреть видео
                    </Link>
                  ) : null}
                  {r.target_type === "comment" && r.moderation_context?.video_id ? (
                    <Link
                      href={`/watch/${encodeURIComponent(r.moderation_context.video_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-100 transition hover:bg-sky-500/25"
                    >
                      Страница видео
                    </Link>
                  ) : null}
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
                  {isAdmin ? (
                    <button
                      type="button"
                      className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-2 py-1 text-xs text-rose-100"
                      onClick={() => openBanDialog(r)}
                    >
                      Бан по жалобе
                    </button>
                  ) : null}
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
        {total > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <p className="text-sm text-slate-500">
              Всего: {total}
              {total > pageSize
                ? ` · стр. ${page} из ${Math.max(1, Math.ceil(total / pageSize))}`
                : null}
            </p>
            {total > pageSize ? (
              <>
                <button
                  type="button"
                  disabled={page <= 1}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        </>
      )}

      {banDialogReport ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ban-dialog-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBanDialog();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1120] p-5 shadow-2xl shadow-black/50">
            <h2 id="ban-dialog-title" className="text-lg font-semibold text-slate-100">
              Блокировка по жалобе
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Жалоба #{banDialogReport.id.slice(0, 8)}… ·{" "}
              {targetLabel(banDialogReport.target_type)}
            </p>

            {banDialogReport.ban_target_suggestion && !banUseManualUser ? (
              <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/[0.07] p-3 text-sm">
                <p className="text-slate-300">
                  Будет заблокирован пользователь:{" "}
                  <strong className="text-slate-100">
                    {banDialogReport.ban_target_suggestion.label}
                  </strong>
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  id {banDialogReport.ban_target_suggestion.user_id}
                </p>
                <button
                  type="button"
                  className="mt-3 text-xs text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
                  onClick={() => {
                    setBanUseManualUser(true);
                    setBanSubmitError(null);
                  }}
                >
                  Указать другого пользователя (@handle или UUID)
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500">
                  Пользователь для блокировки (@handle канала или UUID)
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b14] px-3 py-2 text-sm text-slate-100"
                  value={banManualUserInput}
                  onChange={(e) => setBanManualUserInput(e.target.value)}
                  placeholder="@nickname или uuid"
                  autoComplete="off"
                />
                {banDialogReport.ban_target_suggestion ? (
                  <button
                    type="button"
                    className="mt-2 text-xs text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
                    onClick={() => {
                      setBanUseManualUser(false);
                      setBanManualUserInput("");
                      setBanSubmitError(null);
                    }}
                  >
                    Вернуться к предложенному: {banDialogReport.ban_target_suggestion.label}
                  </button>
                ) : null}
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-500">
                Дата и время окончания бана (ISO 8601, UTC)
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b14] px-3 py-2 font-mono text-sm text-slate-100"
                value={banUntilIso}
                onChange={(e) => setBanUntilIso(e.target.value)}
                placeholder="2099-12-31T23:59:59.000Z"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Пример: <code className="text-slate-400">2099-12-31T23:59:59.000Z</code> — фактически «навсегда».
              </p>
            </div>

            {banSubmitError ? (
              <p className="mt-3 text-sm text-rose-300/90">{banSubmitError}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                onClick={() => closeBanDialog()}
                disabled={banSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/30 disabled:opacity-50"
                onClick={() => void submitBanFromDialog()}
                disabled={banSubmitting}
              >
                {banSubmitting ? "Отправка…" : "Заблокировать и закрыть жалобу"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

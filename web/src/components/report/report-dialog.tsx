"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Flag } from "lucide-react";
import clsx from "clsx";
import { REPORT_REASON_CODES } from "@/lib/report-reasons";

type ReportDialogProps = {
  targetType: "video" | "comment" | "channel";
  targetId: string;
  label?: string;
  className?: string;
  /** Кастомная кнопка открытия (например пункт меню «⋯»). */
  renderTrigger?: (onOpen: () => void) => ReactNode;
};

export function ReportDialog({
  targetType,
  targetId,
  label = "Пожаловаться",
  className,
  renderTrigger,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASON_CODES[0]?.code ?? "other");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason_code: reason,
          details: details.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "Не удалось отправить");
        return;
      }
      setMsg("Жалоба отправлена модераторам.");
      setDetails("");
      setTimeout(() => setOpen(false), 900);
    } finally {
      setSending(false);
    }
  };

  const openModal = () => {
    setMsg(null);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1628] p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="report-dialog-title" className="text-base font-semibold text-slate-100">
                Жалоба
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {targetType === "video"
                  ? "Видео"
                  : targetType === "comment"
                    ? "Комментарий"
                    : "Канал"}
              </p>

              <label className="mt-4 block text-xs font-medium text-slate-300">Причина</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/40"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REPORT_REASON_CODES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-xs font-medium text-slate-300">Детали (необязательно)</label>
              <textarea
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/40"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={2000}
              />

              {msg ? <p className="mt-2 text-xs text-cyan-200/90">{msg}</p> : null}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06]"
                  onClick={() => setOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={sending}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
                  onClick={() => void submit()}
                >
                  {sending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <button
          type="button"
          onClick={openModal}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08]",
            className,
          )}
        >
          <Flag className="h-3.5 w-3.5 opacity-80" />
          {label}
        </button>
      )}

      {modal}
    </>
  );
}

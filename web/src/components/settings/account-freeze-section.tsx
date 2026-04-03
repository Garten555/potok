"use client";

import { Snowflake } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

type FreezeEligibility =
  | { status: "loading" }
  | { status: "ready"; canFreeze: true }
  | { status: "ready"; canFreeze: false; reason: "sole_admin" };

export function AccountFreezeSection() {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<FreezeEligibility>({ status: "loading" });
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/freeze")
      .then(async (res) => {
        const j = (await res.json()) as { canFreeze?: boolean; reason?: string };
        if (cancelled) return;
        if (res.ok && j.canFreeze === false && j.reason === "sole_admin") {
          setEligibility({ status: "ready", canFreeze: false, reason: "sole_admin" });
          return;
        }
        setEligibility({ status: "ready", canFreeze: true });
      })
      .catch(() => {
        if (!cancelled) setEligibility({ status: "ready", canFreeze: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const freeze = async () => {
    if (eligibility.status === "ready" && !eligibility.canFreeze) return;
    if (confirmText.trim().toUpperCase() !== "ЗАМОРОЗИТЬ") {
      setFeedback({ kind: "err", text: "Введите слово ЗАМОРОЗИТЬ заглавными буквами для подтверждения." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/account/freeze", { method: "POST" });
      const j = (await res.json()) as { error?: string; account_data_retention_until?: string };
      if (!res.ok) {
        setFeedback({ kind: "err", text: j.error ?? "Не удалось заморозить аккаунт." });
        return;
      }
      setFeedback({
        kind: "ok",
        text: "Аккаунт заморожен. Сейчас вы будете перенаправлены на страницу восстановления доступа.",
      });
      router.replace("/account/frozen");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-200/90">
        <Snowflake className="h-4 w-4" />
        Заморозка аккаунта
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Канал и видео станут недоступны другим пользователям. Полное удаление данных «в один клик» по закону недоступно:
        мы сохраняем записи в течение срока, указанного при заморозке (ориентир — до 5 лет), после чего данные могут быть
        уничтожены. Вы сможете подать заявку на восстановление доступа после входа в аккаунт.
      </p>
      {eligibility.status === "ready" && eligibility.canFreeze === false && eligibility.reason === "sole_admin" ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
          <p className="font-medium text-amber-50">Нельзя заморозить аккаунт</p>
          <p className="mt-1.5 text-amber-100/85">
            Вы единственный администратор сервиса. Сначала назначьте другого администратора в разделе{" "}
            <Link href="/admin/team" className="text-cyan-200 underline-offset-2 hover:text-cyan-100 hover:underline">
              Модераторы
            </Link>
            , иначе после заморозки некому будет обрабатывать заявки и настройки.
          </p>
        </div>
      ) : null}
      <div className="mt-4">
        <label htmlFor="freeze-confirm" className="text-xs text-slate-500">
          Введите <span className="font-mono text-rose-200/90">ЗАМОРОЗИТЬ</span>, чтобы подтвердить
        </label>
        <input
          id="freeze-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={eligibility.status !== "ready" || !eligibility.canFreeze}
          className="mt-1 w-full max-w-sm rounded-xl border border-white/10 bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-rose-500/20 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="ЗАМОРОЗИТЬ"
          autoComplete="off"
        />
      </div>
      {feedback ? (
        <p className={clsx("mt-3 text-sm", feedback.kind === "ok" ? "text-emerald-300/95" : "text-rose-300/95")}>
          {feedback.text}
        </p>
      ) : null}
      <button
        type="button"
        disabled={
          busy ||
          eligibility.status === "loading" ||
          (eligibility.status === "ready" && !eligibility.canFreeze)
        }
        onClick={() => void freeze()}
        className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Выполняется…" : eligibility.status === "loading" ? "Проверка…" : "Заморозить аккаунт"}
      </button>
    </section>
  );
}

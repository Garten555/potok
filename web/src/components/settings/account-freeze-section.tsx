"use client";

import { Snowflake } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

export function AccountFreezeSection() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const freeze = async () => {
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
      <div className="mt-4">
        <label htmlFor="freeze-confirm" className="text-xs text-slate-500">
          Введите <span className="font-mono text-rose-200/90">ЗАМОРОЗИТЬ</span>, чтобы подтвердить
        </label>
        <input
          id="freeze-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-xl border border-white/10 bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-rose-500/20 focus:ring-2"
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
        disabled={busy}
        onClick={() => void freeze()}
        className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-60"
      >
        {busy ? "Выполняется…" : "Заморозить аккаунт"}
      </button>
    </section>
  );
}

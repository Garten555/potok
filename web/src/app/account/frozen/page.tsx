"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FrozenTopBar } from "@/components/layout/frozen-top-bar";
import { useAccountFrozen } from "@/components/layout/account-frozen-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import clsx from "clsx";

const POLL_MS_WHILE_PENDING = 8_000;

type UserRow = {
  account_frozen_at?: string | null;
  account_data_retention_until?: string | null;
  unfreeze_request_status?: string | null;
};

export default function AccountFrozenPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { refresh: refreshFrozenContext } = useAccountFrozen();
  const [loading, setLoading] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [retentionUntil, setRetentionUntil] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("none");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const syncFromServer = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setFrozen(false);
      setRetentionUntil(null);
      setStatus("none");
      return;
    }
    const { data: row } = await supabase
      .from("users")
      .select("account_frozen_at, account_data_retention_until, unfreeze_request_status")
      .eq("id", auth.user.id)
      .maybeSingle();

    const r = row as UserRow | null;
    const nextFrozen = Boolean(r?.account_frozen_at);
    setFrozen(nextFrozen);
    setRetentionUntil(r?.account_data_retention_until ?? null);
    setStatus(r?.unfreeze_request_status ?? "none");
    if (!nextFrozen) {
      refreshFrozenContext();
    }
  }, [supabase, refreshFrozenContext]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await syncFromServer();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [syncFromServer]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void syncFromServer();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncFromServer]);

  useEffect(() => {
    if (!frozen || status !== "pending") return;
    const id = window.setInterval(() => void syncFromServer(), POLL_MS_WHILE_PENDING);
    return () => window.clearInterval(id);
  }, [frozen, status, syncFromServer]);

  const submitRequest = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/unfreeze-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: "err", text: j.error ?? "Не удалось отправить." });
        return;
      }
      setFeedback({
        kind: "ok",
        text: "Заявка отправлена. Мы рассмотрим её и примем решение. Ожидайте ответа на email.",
      });
      setStatus("pending");
      setMessage("");
      void syncFromServer();
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div>
        <FrozenTopBar />
        <main className="mx-auto max-w-lg px-4 py-16 text-center text-slate-400">Загрузка…</main>
      </div>
    );
  }

  if (!frozen) {
    return (
      <div>
        <FrozenTopBar />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-slate-300">Аккаунт не заморожен.</p>
          <Link href="/" className="mt-4 inline-block text-cyan-300 hover:underline">
            На главную
          </Link>
        </main>
      </div>
    );
  }

  const retentionLabel = retentionUntil
    ? new Date(retentionUntil).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div>
      <FrozenTopBar />
      <main className="mx-auto max-w-xl px-4 py-10 md:px-6">
        <h1 className="text-xl font-semibold text-slate-100">Аккаунт заморожен</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Канал и видео недоступны остальным пользователям. Удаление персональных данных по закону выполняется не
          сразу: данные могут храниться до указанного срока, после чего будут уничтожены, если иное не потребует закон.
        </p>
        {retentionLabel ? (
          <p className="mt-2 text-sm text-slate-500">
            Ориентировочный срок хранения записей: <span className="text-slate-300">{retentionLabel}</span>
          </p>
        ) : null}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {status === "pending" ? (
            <>
              <p className="text-sm text-slate-300">
                Ваша заявка на восстановление доступа уже на рассмотрении. Мы примем решение и свяжемся с вами при
                необходимости.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Статус обновляется автоматически, перезагружать страницу не нужно.
              </p>
            </>
          ) : (
            <>
              {status === "rejected" ? (
                <p className="mb-4 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/95">
                  Предыдущая заявка отклонена. При необходимости отправьте новую ниже.
                </p>
              ) : null}
              <p className="text-sm text-slate-300">
                Чтобы мы могли рассмотреть восстановление доступа ко всем вашим видео, пожалуйста, кратко опишите, почему
                вы ушли с платформы и что изменилось.
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="mt-4 w-full rounded-xl border border-white/10 bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-500/30 focus:ring-2"
                placeholder="Не менее 10 символов…"
              />
              {feedback ? (
                <p className={clsx("mt-3 text-sm", feedback.kind === "ok" ? "text-emerald-300/95" : "text-rose-300/95")}>
                  {feedback.text}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy || message.trim().length < 10}
                onClick={() => void submitRequest()}
                className="mt-4 w-full rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
              >
                {busy ? "Отправка…" : "Отправить заявку"}
              </button>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Выйти из аккаунта
          </button>
        </div>
      </main>
    </div>
  );
}

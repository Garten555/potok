"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, KeyRound, Trash2, Video, UserCog, Wrench } from "lucide-react";
import { clearSearchHistory } from "@/lib/search-history";
import { useAuthState } from "@/components/auth/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPasswordValidationState, strongPasswordPairSchema } from "@/lib/password-validation";
import { PasswordRequirementsPanel } from "@/components/password-requirements-panel";
import { AccountFreezeSection } from "@/components/settings/account-freeze-section";

export function SettingsContent() {
  const { isAuthenticated } = useAuthState();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-12 pt-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Настройки</h1>
        <p className="mt-1 text-sm text-slate-400">Аккаунт, поиск и быстрые ссылки.</p>
      </div>

      {isAuthenticated ? (
        <>
          <AccountSecuritySection />
          <AccountFreezeSection />
        </>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          <Wrench className="h-4 w-4" />
          Поиск
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Недавние запросы хранятся только в этом браузере (localStorage).
        </p>
        <button
          type="button"
          onClick={() => {
            clearSearchHistory();
            window.dispatchEvent(new Event("potok-search-history-cleared"));
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Очистить историю поиска
        </button>
      </section>

      {isAuthenticated ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <UserCog className="h-4 w-4" />
            Канал и контент
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/channel/edit"
              className={clsx(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20",
              )}
            >
              Оформление канала
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Link>
            <Link
              href="/studio"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.1]"
            >
              <Video className="h-4 w-4 text-cyan-200" />
              Студия
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-400">
            <Link href="/auth" className="text-cyan-300 underline-offset-2 hover:underline">
              Войдите
            </Link>
            , чтобы управлять каналом и загрузками.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">О сервисе</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          ПОТОК — видеоплатформа. Подсказки и уведомления будем добавлять по мере развития продукта.
        </p>
      </section>
    </div>
  );
}

function AccountSecuritySection() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const passwordValidation = useMemo(() => getPasswordValidationState(password), [password]);
  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const canSavePassword =
    currentPassword.length > 0 &&
    passwordValidation.isStrong &&
    confirm.length > 0 &&
    !confirmMismatch;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!email) {
      setFeedback({ kind: "err", text: "Не удалось определить email." });
      return;
    }
    if (currentPassword.length < 1) {
      setFeedback({ kind: "err", text: "Введите текущий пароль." });
      return;
    }
    const pwParsed = strongPasswordPairSchema.safeParse({ password, confirmPassword: confirm });
    if (!pwParsed.success) {
      setFeedback({
        kind: "err",
        text: pwParsed.error.issues[0]?.message ?? "Проверьте новый пароль.",
      });
      return;
    }
    setBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (authErr) {
      setBusy(false);
      setFeedback({
        kind: "err",
        text:
          authErr.message.includes("Invalid login") || authErr.message.includes("credentials")
            ? "Неверный текущий пароль."
            : authErr.message,
      });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwParsed.data.password });
    setBusy(false);
    if (error) {
      setFeedback({ kind: "err", text: error.message || "Не удалось сменить пароль." });
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    router.push("/");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <KeyRound className="h-4 w-4" />
        Аккаунт и безопасность
      </h2>
      {email ? (
        <p className="mt-2 text-sm text-slate-400">
          Вход по email: <span className="text-slate-200">{email}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Загружаем профиль…</p>
      )}
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="settings-current-password" className="text-xs text-slate-400">
            Текущий пароль
          </label>
          <input
            id="settings-current-password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-500/30 placeholder:text-slate-600 focus:ring-2"
            placeholder="Для смены пароля обязателен"
          />
        </div>
        <div>
          <label htmlFor="settings-new-password" className="text-xs text-slate-400">
            Новый пароль
          </label>
          <input
            id="settings-new-password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFeedback(null);
            }}
            className={clsx(
              "mt-1 w-full rounded-xl border bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-500/30 placeholder:text-slate-600 focus:ring-2",
              password.length > 0 && !passwordValidation.isStrong ? "border-amber-400/35" : "border-white/10",
            )}
            placeholder="Латиница, цифра, спецсимвол, регистр…"
          />
          {password.length > 0 ? (
            <div className="mt-3">
              <PasswordRequirementsPanel state={passwordValidation} />
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="settings-confirm-password" className="text-xs text-slate-400">
            Повторите пароль
          </label>
          <input
            id="settings-confirm-password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setFeedback(null);
            }}
            className={clsx(
              "mt-1 w-full rounded-xl border bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-500/30 placeholder:text-slate-600 focus:ring-2",
              confirmMismatch ? "border-rose-400/45" : "border-white/10",
            )}
          />
          {confirmMismatch ? (
            <p className="mt-1 text-xs text-rose-300/95">Пароли не совпадают.</p>
          ) : null}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
            className="rounded border-white/20 bg-[#0c101c]"
          />
          Показать символы
        </label>
        {feedback ? (
          <p className={clsx("text-sm", feedback.kind === "ok" ? "text-emerald-300/95" : "text-rose-300/95")}>
            {feedback.text}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !canSavePassword}
          className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Сохранение…" : "Сохранить новый пароль"}
        </button>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        Забыли текущий пароль?{" "}
        <Link href="/auth/forgot-password" className="text-cyan-300 underline-offset-2 hover:underline">
          Сброс по email
        </Link>
      </p>
    </section>
  );
}

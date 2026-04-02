"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPasswordValidationState, strongPasswordPairSchema } from "@/lib/password-validation";

const emailCodeSchema = z.object({
  email: z.email("Введите корректный email."),
  code: z.string().min(8, "Введите полный код из письма (8 цифр)."),
});

function getErrorRu(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("token") || m.includes("otp")) return "Неверный или просроченный код.";
  if (m.includes("password")) return "Не удалось установить пароль.";
  return "Ошибка. Попробуйте снова.";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isPasswordHovered, setIsPasswordHovered] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [fromRecoveryLink, setFromRecoveryLink] = useState(false);

  const hasSupabaseEnv = useMemo(
    () =>
      !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    [],
  );

  const passwordValidation = useMemo(() => getPasswordValidationState(password), [password]);
  const isConfirmPasswordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const saveBlockReason = useMemo(() => {
    if (!passwordValidation.isStrong) {
      return "Пароль слишком слабый. Выполните все требования к паролю.";
    }
    if (confirmPassword.length === 0) {
      return "Повторите пароль для подтверждения.";
    }
    if (isConfirmPasswordMismatch) {
      return "Пароли не совпадают.";
    }
    return null;
  }, [passwordValidation.isStrong, confirmPassword.length, isConfirmPasswordMismatch]);

  useEffect(() => {
    if (!hasSupabaseEnv) return;

    const supabase = createSupabaseBrowserClient();
    const hashLooksRecovery =
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        window.location.hash.includes("type%3Drecovery"));

    const applySession = (session: { user: { email?: string | null } } | null) => {
      if (session?.user?.email) {
        setFromRecoveryLink(true);
        setEmail(session.user.email);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        applySession(session);
      }
    });

    if (hashLooksRecovery) {
      void supabase.auth.getSession().then(({ data: { session } }) => applySession(session));
    }

    return () => listener.subscription.unsubscribe();
  }, [hasSupabaseEnv]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setResendMessage("");
    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createSupabaseBrowserClient();

      if (fromRecoveryLink) {
        const parsed = strongPasswordPairSchema.safeParse({ password, confirmPassword });
        if (!parsed.success) {
          const next: { password?: string; confirmPassword?: string } = {};
          for (const issue of parsed.error.issues) {
            const key = issue.path[0];
            if (key === "password" && !next.password) next.password = issue.message;
            if (key === "confirmPassword" && !next.confirmPassword) next.confirmPassword = issue.message;
          }
          setFieldErrors(next);
          setError(parsed.error.issues[0]?.message ?? "Проверьте поля.");
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({
          password: parsed.data.password,
        });
        if (updateError) {
          setError(getErrorRu(updateError.message));
          return;
        }
        router.push("/");
        router.refresh();
        return;
      }

      const digits = code.replace(/\D/g, "");
      const ecParsed = emailCodeSchema.safeParse({
        email: email.trim(),
        code: digits,
      });
      if (!ecParsed.success) {
        setError(ecParsed.error.issues[0]?.message ?? "Проверьте поля.");
        return;
      }

      const pwParsed = strongPasswordPairSchema.safeParse({ password, confirmPassword });
      if (!pwParsed.success) {
        const next: { password?: string; confirmPassword?: string } = {};
        for (const issue of pwParsed.error.issues) {
          const key = issue.path[0];
          if (key === "password" && !next.password) next.password = issue.message;
          if (key === "confirmPassword" && !next.confirmPassword) next.confirmPassword = issue.message;
        }
        setFieldErrors(next);
        setError(pwParsed.error.issues[0]?.message ?? "Проверьте поля.");
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: ecParsed.data.email,
        token: digits,
        type: "recovery",
      });
      if (verifyError) {
        setError(getErrorRu(verifyError.message));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: pwParsed.data.password,
      });
      if (updateError) {
        setError(getErrorRu(updateError.message));
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !hasSupabaseEnv) {
      setError("Сначала укажите email.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.resetPasswordForEmail(trimmed);
    if (resendError) {
      setError("Не удалось отправить письмо повторно.");
      return;
    }
    setError("");
    setResendMessage("Если аккаунт существует, письмо отправлено снова.");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0c1120] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1628] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.38)] sm:p-8">
        <div className="mb-2 h-9 w-28 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-100">Новый пароль</h1>
        <p className="mt-2 text-sm text-slate-400">
          {fromRecoveryLink
            ? "Вы перешли по ссылке из письма. Придумайте новый пароль."
            : "Введите email, код из письма и придумайте новый пароль."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!fromRecoveryLink ? (
            <>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Код из письма</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-center text-lg tracking-[0.35em] text-slate-100 outline-none transition focus:border-cyan-400/55"
                />
              </label>
            </>
          ) : email ? (
            <p className="rounded-lg border border-white/10 bg-[#0c1323] px-3 py-2 text-sm text-slate-300">
              {email}
            </p>
          ) : null}

          <label
            className="relative block space-y-1"
            onMouseEnter={() => setIsPasswordHovered(true)}
            onMouseLeave={() => setIsPasswordHovered(false)}
          >
            <span className="text-xs text-slate-400">Новый пароль</span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              required
              className={clsx(
                "w-full rounded-xl border bg-[#0c1323] px-3 py-2.5 pr-24 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55",
                fieldErrors.password ? "border-rose-400/50" : "border-white/10",
              )}
              placeholder="******"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-[31px] text-xs text-cyan-200/90 transition hover:text-cyan-100"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
            {fieldErrors.password ? (
              <span className="text-xs text-rose-300">{fieldErrors.password}</span>
            ) : null}
            {isPasswordFocused || isPasswordHovered ? (
              <div className="pointer-events-none absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-white/10 bg-[#131a2c]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Надежность пароля</span>
                  <span
                    className={clsx(
                      "text-xs font-medium",
                      passwordValidation.isStrong
                        ? "text-emerald-300"
                        : passwordValidation.score >= 4
                          ? "text-amber-300"
                          : "text-rose-300",
                    )}
                  >
                    {passwordValidation.isStrong
                      ? "Сильный"
                      : passwordValidation.score >= 4
                        ? "Средний"
                        : "Слабый"}
                  </span>
                </div>
                <div className="mb-3 h-1.5 w-full rounded-full bg-[#0c1323]">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      passwordValidation.isStrong
                        ? "bg-emerald-400"
                        : passwordValidation.score >= 4
                          ? "bg-amber-400"
                          : "bg-rose-400",
                    )}
                    style={{ width: `${(passwordValidation.score / 6) * 100}%` }}
                  />
                </div>
                {!passwordValidation.noCyrillic && password.length > 0 ? (
                  <p className="mb-2 text-xs text-rose-300">
                    Внимание: пароль не должен содержать русские символы.
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  <span className={clsx(passwordValidation.minLength ? "text-emerald-300" : "text-slate-400")}>
                    {passwordValidation.minLength ? "✓" : "•"} Минимум 8 символов
                  </span>
                  <span className={clsx(passwordValidation.hasLowercase ? "text-emerald-300" : "text-slate-400")}>
                    {passwordValidation.hasLowercase ? "✓" : "•"} Строчная латинская буква
                  </span>
                  <span className={clsx(passwordValidation.hasUppercase ? "text-emerald-300" : "text-slate-400")}>
                    {passwordValidation.hasUppercase ? "✓" : "•"} Заглавная латинская буква
                  </span>
                  <span className={clsx(passwordValidation.hasDigit ? "text-emerald-300" : "text-slate-400")}>
                    {passwordValidation.hasDigit ? "✓" : "•"} Минимум одна цифра
                  </span>
                  <span className={clsx(passwordValidation.hasSpecial ? "text-emerald-300" : "text-slate-400")}>
                    {passwordValidation.hasSpecial ? "✓" : "•"} Минимум один спецсимвол
                  </span>
                  <span className={clsx(passwordValidation.noCyrillic ? "text-emerald-300" : "text-slate-400")}>
                    {passwordValidation.noCyrillic ? "✓" : "•"} Без русских символов
                  </span>
                </div>
              </div>
            ) : null}
          </label>

          <label className="relative block space-y-1">
            <span className="text-xs text-slate-400">Повторите пароль</span>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              required
              className={clsx(
                "w-full rounded-xl border bg-[#0c1323] px-3 py-2.5 pr-24 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55",
                fieldErrors.confirmPassword || isConfirmPasswordMismatch
                  ? "border-rose-400/50"
                  : "border-white/10",
              )}
              placeholder="******"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-3 top-[31px] text-xs text-cyan-200/90 transition hover:text-cyan-100"
            >
              {showConfirmPassword ? "Скрыть" : "Показать"}
            </button>
            {fieldErrors.confirmPassword || isConfirmPasswordMismatch ? (
              <span className="text-xs text-rose-300">
                {fieldErrors.confirmPassword ?? "Пароли не совпадают."}
              </span>
            ) : null}
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </p>
          ) : null}
          {resendMessage && !error ? (
            <p className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
              {resendMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !!saveBlockReason}
            className={clsx(
              "w-full rounded-xl border border-cyan-300/35 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60",
            )}
          >
            {isSubmitting ? "Сохранение..." : "Сохранить пароль"}
          </button>

          {!fromRecoveryLink ? (
            <button
              type="button"
              onClick={handleResend}
              className="w-full text-center text-sm text-cyan-200/90 hover:text-cyan-100"
            >
              Отправить код снова
            </button>
          ) : null}
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-500">
          <Link href="/auth/forgot-password" className="text-cyan-300 hover:text-cyan-200">
            Запросить письмо ещё раз
          </Link>
          <Link href="/auth" className="hover:text-slate-300">
            ← Ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}

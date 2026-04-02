"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPasswordValidationState, strongPasswordPairSchema } from "@/lib/password-validation";

/** Длина recovery-кода из письма Supabase (в проекте приходит 8 цифр). */
const OTP_LENGTH = 8;

const emailSchema = z.object({
  email: z.email("Введите корректный email."),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isPasswordHovered, setIsPasswordHovered] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

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

  const hasSupabaseEnv = useMemo(
    () =>
      !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    [],
  );

  const requestResetCode = async () => {
    const parsed = emailSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Некорректный email.");
      return false;
    }
    const res = await fetch("/api/auth/send-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: parsed.data.email }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Не удалось отправить письмо. Проверьте SMTP в .env.local.");
      return false;
    }
    return true;
  };

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }

    try {
      setIsSubmitting(true);
      const ok = await requestResetCode();
      if (!ok) return;
      setStep("otp");
      setMessage(`Код отправлен. Введите ${OTP_LENGTH} цифр из письма.`);
      setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, raw: string) => {
    const val = raw.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    if (val && index < otpRefs.current.length - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    if (digits.length === 0) return;
    setOtp((prev) => prev.map((_, i) => digits[i] ?? ""));
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }

    const parsedEmail = emailSchema.safeParse({ email: email.trim() });
    if (!parsedEmail.success) {
      setError(parsedEmail.error.issues[0]?.message ?? "Некорректный email.");
      return;
    }

    const token = otp.join("");
    if (token.length !== OTP_LENGTH) {
      setError(`Введите все ${OTP_LENGTH} цифр кода.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: parsedEmail.data.email,
        token,
        type: "recovery",
      });
      if (verifyError) {
        setError("Неверный или просроченный код.");
        return;
      }
      setStep("password");
      setMessage("Код подтвержден. Теперь задайте новый пароль.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});
    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }

    const parsedPassword = strongPasswordPairSchema.safeParse({ password, confirmPassword });
    if (!parsedPassword.success) {
      const next: { password?: string; confirmPassword?: string } = {};
      for (const issue of parsedPassword.error.issues) {
        const key = issue.path[0];
        if (key === "password" && !next.password) next.password = issue.message;
        if (key === "confirmPassword" && !next.confirmPassword) next.confirmPassword = issue.message;
      }
      setFieldErrors(next);
      setError(parsedPassword.error.issues[0]?.message ?? "Проверьте пароль.");
      return;
    }
    setFieldErrors({});

    try {
      setIsSubmitting(true);
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: parsedPassword.data.password,
      });
      if (updateError) {
        setError("Не удалось установить новый пароль.");
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
    setMessage("");
    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }
    try {
      setIsSubmitting(true);
      const ok = await requestResetCode();
      if (!ok) return;
      setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
      setMessage("Новый код отправлен на почту.");
      otpRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0c1120] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1628] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.38)] sm:p-8">
        <div className="mb-2 h-9 w-28 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-100">Забыли пароль?</h1>
        <p className="mt-2 text-sm text-slate-400">Шаги: 1) email, 2) код из письма, 3) новый пароль.</p>

        {step === "email" ? (
          <form className="mt-6 space-y-4" onSubmit={handleSendCode}>
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                placeholder="you@example.com"
              />
            </label>
            {error ? (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {isSubmitting ? "Отправка..." : "Отправить письмо"}
            </button>
          </form>
        ) : step === "otp" ? (
          <form className="mt-6 space-y-4" onSubmit={handleVerifyCode}>
            <div className="space-y-2">
              <span className="text-xs text-slate-400">Код из письма</span>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      handleOtpPaste(e.clipboardData.getData("text"));
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#0c1323] text-center text-lg font-semibold text-slate-100 outline-none transition focus:border-cyan-400/55"
                  />
                ))}
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {isSubmitting ? "Проверка..." : "Подтвердить код"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isSubmitting}
              className="w-full text-center text-sm text-cyan-200/90 transition hover:text-cyan-100 disabled:opacity-60"
            >
              Отправить код снова
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSavePassword}>
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
                onClick={() => setShowPassword((prev) => !prev)}
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
                onClick={() => setShowConfirmPassword((prev) => !prev)}
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
            {message ? (
              <p className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !!saveBlockReason}
              className="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {isSubmitting ? "Сохранение..." : "Сохранить новый пароль"}
            </button>
          </form>
        )}

        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-500">
          <Link href="/auth" className="text-cyan-300 hover:text-cyan-200">
            ← Назад ко входу
          </Link>
          <Link href="/" className="hover:text-slate-300">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

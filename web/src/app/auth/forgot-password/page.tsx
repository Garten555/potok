"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const OTP_LENGTH = 8;

const emailSchema = z.object({
  email: z.email("Введите корректный email."),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Пароль не короче 8 символов."),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Пароли не совпадают." });
    }
  });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

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
    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
    if (resetError) {
      setError("Не удалось отправить письмо. Попробуйте позже.");
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
      setMessage("Код отправлен. Введите 6 цифр из письма.");
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
    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }

    const parsedPassword = passwordSchema.safeParse({ password, confirmPassword });
    if (!parsedPassword.success) {
      setError(parsedPassword.error.issues[0]?.message ?? "Проверьте пароль.");
      return;
    }

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

      setMessage("Пароль обновлён. Теперь можно войти.");
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
      setOtp(["", "", "", "", "", ""]);
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
              <div className="grid grid-cols-8 gap-2">
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
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Новый пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Повторите пароль</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
              />
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
              disabled={isSubmitting}
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

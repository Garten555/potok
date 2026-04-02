"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPasswordValidationState } from "@/lib/password-validation";

type AuthMode = "login" | "register";
type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  channelName?: string;
};

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "2200freefonts.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "dispostable.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "moakt.com",
  "minuteinbox.com",
  "maildrop.cc",
  "sharklasers.com",
  "grr.la",
]);

const RU_PROFANITY_PATTERNS = [
  /х+у+[йияеёю]*/u,
  /п[ие]зд/u,
  /еб[аеиёоуыюя]*/u,
  /бля[дть]*/u,
  /сук[аи]/u,
  /муд[ао]к/u,
  /гандон/u,
  /долбоеб/u,
  /чмо/u,
];

const EN_PROFANITY_PATTERNS = [
  /fuck/u,
  /shit/u,
  /bitch/u,
  /asshole/u,
  /dick/u,
  /cunt/u,
  /motherfucker/u,
  /fag/u,
  /slut/u,
  /whore/u,
];

function isDisposableEmail(email: string): boolean {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase();
  return (
    DISPOSABLE_EMAIL_DOMAINS.has(domain) ||
    Array.from(DISPOSABLE_EMAIL_DOMAINS).some(
      (blockedDomain) => domain.endsWith(`.${blockedDomain}`),
    )
  );
}

function normalizeForProfanity(value: string): string {
  return value
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-zа-яё]/gu, "");
}

function containsProfanity(value: string): boolean {
  const normalized = normalizeForProfanity(value);
  return (
    RU_PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    EN_PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

function getChannelNameValidationError(channelName: string): string | null {
  const normalized = channelName.trim();
  if (!normalized) {
    return "Введите название канала.";
  }
  if (normalized.length < 3) {
    return "Название канала должно быть не короче 3 символов.";
  }
  if (normalized.length > 40) {
    return "Название канала должно быть не длиннее 40 символов.";
  }
  if (!/^[A-Za-zА-Яа-яЁё0-9 _.-]+$/u.test(normalized)) {
    return "Разрешены русские и английские буквы, цифры, пробел, _ . -";
  }
  if (containsProfanity(normalized)) {
    return "Название канала содержит недопустимую лексику.";
  }
  return null;
}

function getEmailValidationError(email: string, isRegisterMode: boolean): string | null {
  const normalized = email.trim();
  if (!normalized) {
    return "Введите email.";
  }
  const parsed = z.email("Введите корректный email.").safeParse(normalized);
  if (!parsed.success) {
    return "Введите корректный email.";
  }
  if (isRegisterMode && isDisposableEmail(normalized)) {
    return "Временная почта не поддерживается. Укажите постоянный email.";
  }
  return null;
}

function getAuthErrorMessageRu(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (message.includes("email not confirmed")) {
    return "Подтвердите email перед входом.";
  }
  if (message.includes("user already registered")) {
    return "Пользователь с таким email уже зарегистрирован.";
  }
  if (message.includes("password should be at least")) {
    return "Пароль слишком короткий.";
  }
  if (message.includes("signup is disabled")) {
    return "Регистрация сейчас отключена.";
  }
  if (message.includes("too many requests")) {
    return "Слишком много попыток. Попробуйте позже.";
  }
  if (message.includes("token") && (message.includes("invalid") || message.includes("expired"))) {
    return "Код неверный или истёк. Запросите новый код.";
  }
  if (message.includes("otp")) {
    return "Проверьте код и попробуйте снова.";
  }

  return "Произошла ошибка авторизации. Попробуйте снова.";
}

const loginSchema = z.object({
  email: z.email("Введите корректный email."),
  password: z
    .string()
    .min(6, "Пароль должен содержать минимум 6 символов.")
    .max(128, "Пароль слишком длинный."),
});

const registerSchema = loginSchema.extend({
  channelName: z
    .string()
    .trim()
    .min(3, "Название канала должно быть не короче 3 символов.")
    .max(40, "Название канала должно быть не длиннее 40 символов.")
    .regex(
      /^[A-Za-zА-Яа-яЁё0-9 _.-]+$/u,
      "Разрешены русские и английские буквы, цифры, пробел, _ . -",
    )
    .refine(
      (value) => !containsProfanity(value),
      "Название канала содержит недопустимую лексику.",
    ),
  confirmPassword: z.string(),
}).superRefine((value, ctx) => {
  if (isDisposableEmail(value.email)) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Временная почта не поддерживается. Укажите постоянный email.",
    });
  }

  const checks = getPasswordValidationState(value.password);

  if (!checks.minLength) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Пароль должен содержать минимум 8 символов.",
    });
  }
  if (!checks.noCyrillic) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Пароль не должен содержать русские символы.",
    });
  }
  if (!checks.hasLowercase) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Добавьте минимум одну строчную латинскую букву.",
    });
  }
  if (!checks.hasUppercase) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Добавьте минимум одну заглавную латинскую букву.",
    });
  }
  if (!checks.hasDigit) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Добавьте минимум одну цифру.",
    });
  }
  if (!checks.hasSpecial) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Добавьте минимум один специальный символ.",
    });
  }
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Пароли не совпадают.",
    });
  }
});

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [channelName, setChannelName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isPasswordHovered, setIsPasswordHovered] = useState(false);
  const [isEmailTouched, setIsEmailTouched] = useState(false);
  const [isChannelNameTouched, setIsChannelNameTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  /** После signUp без сессии — подтверждение по коду из письма (не по ссылке). */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  /** После пароля — второй фактор (TOTP), если включён в Supabase MFA. */
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const hasSupabaseEnv = useMemo(
    () =>
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    [],
  );
  const passwordValidation = useMemo(
    () => getPasswordValidationState(password),
    [password],
  );
  const emailLiveError = useMemo(() => {
    if (!isEmailTouched && email.trim().length === 0) return null;
    return getEmailValidationError(email, mode === "register");
  }, [email, isEmailTouched, mode]);
  const channelNameLiveError = useMemo(() => {
    if (mode !== "register") return null;
    if (!isChannelNameTouched && channelName.trim().length === 0) return null;
    return getChannelNameValidationError(channelName);
  }, [channelName, isChannelNameTouched, mode]);
  const isConfirmPasswordMismatch =
    mode === "register" && confirmPassword.length > 0 && password !== confirmPassword;
  const registerBlockReason = useMemo(() => {
    if (mode !== "register") return null;

    const channelError = getChannelNameValidationError(channelName);
    if (channelError) return channelError;

    const emailError = getEmailValidationError(email, true);
    if (emailError) return emailError;

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
  }, [
    mode,
    channelName,
    email,
    passwordValidation.isStrong,
    confirmPassword.length,
    isConfirmPasswordMismatch,
  ]);

  const submitLabel = mode === "login" ? "Войти" : "Зарегистрироваться";
  const isRegisterSubmitBlocked = mode === "register" && !!registerBlockReason;

  useEffect(() => {
    setIsSwitchingMode(true);
    const id = window.setTimeout(() => setIsSwitchingMode(false), 260);
    return () => window.clearTimeout(id);
  }, [mode]);

  useEffect(() => {
    setFieldErrors({});
    setError("");
    setMessage("");
    setIsEmailTouched(false);
    setIsChannelNameTouched(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPendingEmail(null);
    setOtpCode("");
    setNeedsMfa(false);
    setMfaFactorId(null);
    setMfaCode("");
  }, [mode]);

  const clearOtpFlow = () => {
    setPendingEmail(null);
    setOtpCode("");
    setError("");
    setMessage("");
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingEmail || !hasSupabaseEnv) return;
    const digits = otpCode.replace(/\D/g, "");
    if (digits.length < 6) {
      setError("Введите код из письма (обычно 6 цифр).");
      return;
    }
    setError("");
    setMessage("");
    try {
      setIsVerifyingOtp(true);
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingEmail.trim(),
        token: digits,
        type: "signup",
      });
      if (verifyError) {
        setError(getAuthErrorMessageRu(verifyError.message));
        return;
      }
      clearOtpFlow();
      router.push("/");
      router.refresh();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail || !hasSupabaseEnv) {
      if (!hasSupabaseEnv) setError("Не настроены переменные Supabase в .env.local");
      return;
    }
    setError("");
    setMessage("");
    try {
      setIsResendingOtp(true);
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail.trim(),
      });
      if (resendError) {
        setError(getAuthErrorMessageRu(resendError.message));
        return;
      }
      setMessage("Код отправлен повторно.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !hasSupabaseEnv) return;
    const code = mfaCode.replace(/\D/g, "");
    if (code.length < 6) {
      setError("Введите 6 цифр из приложения аутентификации.");
      return;
    }
    setError("");
    setMessage("");
    try {
      setIsSubmitting(true);
      const supabase = createSupabaseBrowserClient();
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr || !challenge?.id) {
        setError(chErr?.message ?? "Не удалось запросить проверку кода.");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        setError(getAuthErrorMessageRu(vErr.message));
        return;
      }
      setNeedsMfa(false);
      setMfaFactorId(null);
      setMfaCode("");
      router.push("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setFieldErrors({});

    if (!hasSupabaseEnv) {
      setError("Не настроены переменные Supabase в .env.local");
      return;
    }

    const normalizedEmail = email.trim();
    const normalizedChannelName = channelName.trim();
    const payload =
      mode === "login"
        ? { email: normalizedEmail, password }
        : {
            email: normalizedEmail,
            password,
            confirmPassword,
            channelName: normalizedChannelName,
          };
    const validationResult =
      mode === "login"
        ? loginSchema.safeParse(payload)
        : registerSchema.safeParse(payload);

    if (!validationResult.success) {
      const nextFieldErrors: FieldErrors = {};
      for (const issue of validationResult.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!nextFieldErrors[key]) {
          nextFieldErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (loginError) {
          setError(getAuthErrorMessageRu(loginError.message));
          return;
        }

        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
          const { data: facData } = await supabase.auth.mfa.listFactors();
          const totpFactor = facData?.totp?.find((f) => f.status === "verified");
          if (!totpFactor?.id) {
            setError(
              "Включена двухфакторная защита, но фактор не найден. Выйдите и обратитесь в поддержку или отключите MFA в настройках с другого сеанса.",
            );
            await supabase.auth.signOut();
            return;
          }
          setMfaFactorId(totpFactor.id);
          setNeedsMfa(true);
          setMfaCode("");
          setMessage("Введите одноразовый код из приложения (Google Authenticator и т.п.).");
          return;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            channel_name: normalizedChannelName,
            username: normalizedChannelName,
          },
        },
      });

      if (signupError) {
        setError(getAuthErrorMessageRu(signupError.message));
        return;
      }

      if (signupData.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setPendingEmail(normalizedEmail);
      setOtpCode("");
      setMessage("Введите код из письма (цифры, без ссылки).");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="grid min-h-screen w-full overflow-hidden border-y border-white/10 bg-[#0f1628] shadow-[0_25px_70px_rgba(0,0,0,0.38)] lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden border-r border-white/10 bg-[radial-gradient(120%_80%_at_10%_10%,rgba(56,189,248,0.22),rgba(15,23,42,0)_48%),linear-gradient(160deg,#0b1220_0%,#10192d_100%)] p-8 lg:flex lg:flex-col">
          <Link href="/" className="inline-block h-11 w-36 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat outline-none ring-cyan-500/40 focus-visible:ring-2" aria-label="На главную" />
          <h1
            className={clsx(
              "mt-8 text-3xl font-semibold leading-tight text-slate-100 transition-all duration-300",
              isSwitchingMode ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
            )}
          >
            {mode === "login" ? "С возвращением в POTOK" : "Создайте аккаунт POTOK"}
          </h1>
          <p
            className={clsx(
              "mt-3 max-w-md text-sm leading-6 text-slate-300 transition-all duration-300",
              isSwitchingMode ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
            )}
          >
            Единая форма входа и регистрации. После входа откроются подписки,
            история и персональные рекомендации.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Защищенный вход и стабильная работа аккаунта
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              Один аккаунт для ленты, комментариев и уведомлений
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Возможности</p>
              <p className="mt-1 text-sm font-medium text-slate-100">Подписки и история</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Персонализация</p>
              <p className="mt-1 text-sm font-medium text-slate-100">Умные рекомендации</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Активность</p>
              <p className="mt-1 text-sm font-medium text-slate-100">Комментарии и лайки</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Синхронизация</p>
              <p className="mt-1 text-sm font-medium text-slate-100">Доступ с любого устройства</p>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              POTOK объединяет ленту, каналы и взаимодействие в одном аккаунте.
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-6 md:p-8">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="block h-10 w-32 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat outline-none ring-cyan-500/40 focus-visible:ring-2" aria-label="На главную" />
          </div>

          <h2
            className={clsx(
              "text-2xl font-semibold text-slate-100 transition-all duration-300",
              isSwitchingMode ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
            )}
          >
            {pendingEmail ? "Подтверждение email" : mode === "login" ? "Вход" : "Регистрация"}
          </h2>
          <p
            className={clsx(
              "mt-1 text-sm text-slate-400 transition-all duration-300",
              isSwitchingMode ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
            )}
          >
            {needsMfa
              ? "Двухфакторная защита: введите одноразовый код."
              : pendingEmail
                ? "Введите код из письма — без перехода по ссылке."
                : mode === "login"
                  ? "Введите данные для входа в аккаунт."
                  : "Заполните поля для создания аккаунта."}
          </p>

          {!pendingEmail && !needsMfa ? (
            <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/10 bg-[#0c1323] p-1">
              <button
                type="button"
                className={clsx(
                  "rounded-lg py-2.5 text-sm transition",
                  mode === "login"
                    ? "bg-cyan-400/25 text-cyan-100"
                    : "text-slate-400 hover:text-slate-200",
                )}
                onClick={() => setMode("login")}
              >
                Вход
              </button>
              <button
                type="button"
                className={clsx(
                  "rounded-lg py-2.5 text-sm transition",
                  mode === "register"
                    ? "bg-cyan-400/25 text-cyan-100"
                    : "text-slate-400 hover:text-slate-200",
                )}
                onClick={() => setMode("register")}
              >
                Регистрация
              </button>
            </div>
          ) : null}

          {needsMfa ? (
            <form className="mt-5 space-y-4" onSubmit={handleMfaSubmit}>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Код аутентификатора (6 цифр)</span>
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-center text-lg tracking-[0.35em] text-slate-100 outline-none transition focus:border-cyan-400/55"
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
                {isSubmitting ? "Проверка…" : "Подтвердить вход"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  setNeedsMfa(false);
                  setMfaFactorId(null);
                  setMfaCode("");
                  setMessage("");
                  setError("");
                }}
                className="w-full text-sm text-slate-400 hover:text-slate-200"
              >
                Назад (выйти из сессии)
              </button>
            </form>
          ) : pendingEmail ? (
            <form className="mt-5 space-y-4" onSubmit={handleVerifyOtp}>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Код из письма</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Отправили на <span className="text-slate-200">{pendingEmail}</span>. В письме — цифры, без перехода по
                  ссылке.
                </p>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Код подтверждения</span>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-center text-lg tracking-[0.4em] text-slate-100 outline-none transition focus:border-cyan-400/55"
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
                disabled={isVerifyingOtp}
                className="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {isVerifyingOtp ? "Проверяем..." : "Подтвердить"}
              </button>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="text-sm text-cyan-200/90 hover:text-cyan-100 disabled:opacity-60"
                >
                  {isResendingOtp ? "Отправка..." : "Отправить код снова"}
                </button>
                <button type="button" onClick={clearOtpFlow} className="text-sm text-slate-400 hover:text-slate-200">
                  Назад к форме
                </button>
              </div>
            </form>
          ) : (
          <form
            className={clsx(
              "mt-5 space-y-3.5 transition-all duration-300",
              isSwitchingMode
                ? "translate-y-1 scale-[0.995] opacity-60"
                : "translate-y-0 scale-100 opacity-100",
            )}
            onSubmit={handleSubmit}
          >
            {mode === "register" ? (
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Название канала</span>
                <input
                  value={channelName}
                  onChange={(e) => {
                    setChannelName(e.target.value);
                    if (!isChannelNameTouched) {
                      setIsChannelNameTouched(true);
                    }
                  }}
                  onBlur={() => setIsChannelNameTouched(true)}
                  required
                  className={clsx(
                    "w-full rounded-xl border bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55",
                    fieldErrors.channelName || channelNameLiveError
                      ? "border-rose-400/50"
                      : "border-white/10",
                  )}
                  placeholder="Мой канал"
                />
                {fieldErrors.channelName || channelNameLiveError ? (
                  <span className="text-xs text-rose-300">
                    {fieldErrors.channelName ?? channelNameLiveError}
                  </span>
                ) : null}
              </label>
            ) : null}

            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!isEmailTouched) {
                    setIsEmailTouched(true);
                  }
                }}
                onBlur={() => setIsEmailTouched(true)}
                required
                className={clsx(
                  "w-full rounded-xl border bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55",
                  fieldErrors.email || emailLiveError ? "border-rose-400/50" : "border-white/10",
                )}
                placeholder="you@example.com"
              />
              {fieldErrors.email || emailLiveError ? (
                <span className="text-xs text-rose-300">{fieldErrors.email ?? emailLiveError}</span>
              ) : null}
            </label>

            <label
              className="relative block space-y-1"
              onMouseEnter={() => setIsPasswordHovered(true)}
              onMouseLeave={() => setIsPasswordHovered(false)}
            >
              <span className="text-xs text-slate-400">Пароль</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {mode === "register" && (isPasswordFocused || isPasswordHovered) ? (
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

            {mode === "login" ? (
              <div className="-mt-1 flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-cyan-200/90 transition hover:text-cyan-100"
                >
                  Забыли пароль?
                </Link>
              </div>
            ) : null}

            {mode === "register" ? (
              <label className="relative block space-y-1">
                <span className="text-xs text-slate-400">Повторите пароль</span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                ) : confirmPassword.length > 0 ? (
                  <span className="text-xs text-emerald-300">Пароли совпадают.</span>
                ) : null}
              </label>
            ) : null}

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
              disabled={isSubmitting || isRegisterSubmitBlocked}
              className="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Подождите..." : submitLabel}
            </button>
          </form>
          )}

          <div className="mt-4 text-center text-xs text-slate-500">
            <Link href="/" className="text-cyan-300 hover:text-cyan-200">
              Вернуться на главную
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import clsx from "clsx";
import type { PasswordValidationState } from "@/lib/password-validation";

/** Плашка «надёжность пароля»: регистрация, сброс, настройки (единый компонент). */
export function PasswordRequirementsPanel({ state }: { state: PasswordValidationState }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0c1320]/90 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-300">Надёжность пароля</span>
        <span
          className={clsx(
            "text-xs font-medium",
            state.isStrong ? "text-emerald-300" : state.score >= 4 ? "text-amber-300" : "text-rose-300",
          )}
        >
          {state.isStrong ? "Сильный" : state.score >= 4 ? "Средний" : "Слабый"}
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full rounded-full bg-[#0c1323]">
        <div
          className={clsx(
            "h-full rounded-full transition-all",
            state.isStrong ? "bg-emerald-400" : state.score >= 4 ? "bg-amber-400" : "bg-rose-400",
          )}
          style={{ width: `${(state.score / 6) * 100}%` }}
        />
      </div>
      {!state.noCyrillic ? (
        <p className="mb-2 text-xs text-rose-300">Пароль не должен содержать русские символы.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        <span className={clsx(state.minLength ? "text-emerald-300" : "text-slate-400")}>
          {state.minLength ? "✓" : "•"} Минимум 8 символов
        </span>
        <span className={clsx(state.hasLowercase ? "text-emerald-300" : "text-slate-400")}>
          {state.hasLowercase ? "✓" : "•"} Строчная латинская буква
        </span>
        <span className={clsx(state.hasUppercase ? "text-emerald-300" : "text-slate-400")}>
          {state.hasUppercase ? "✓" : "•"} Заглавная латинская буква
        </span>
        <span className={clsx(state.hasDigit ? "text-emerald-300" : "text-slate-400")}>
          {state.hasDigit ? "✓" : "•"} Минимум одна цифра
        </span>
        <span className={clsx(state.hasSpecial ? "text-emerald-300" : "text-slate-400")}>
          {state.hasSpecial ? "✓" : "•"} Минимум один спецсимвол
        </span>
        <span className={clsx(state.noCyrillic ? "text-emerald-300" : "text-slate-400")}>
          {state.noCyrillic ? "✓" : "•"} Без русских символов
        </span>
      </div>
    </div>
  );
}

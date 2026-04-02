import { z } from "zod";

export type PasswordValidationState = {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  noCyrillic: boolean;
  score: number;
  isStrong: boolean;
};

export function getPasswordValidationState(password: string): PasswordValidationState {
  const minLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const noCyrillic = !/[А-Яа-яЁё]/.test(password);

  const score = [
    minLength,
    hasLowercase,
    hasUppercase,
    hasDigit,
    hasSpecial,
    noCyrillic,
  ].filter(Boolean).length;

  return {
    minLength,
    hasLowercase,
    hasUppercase,
    hasDigit,
    hasSpecial,
    noCyrillic,
    score,
    isStrong:
      minLength &&
      hasLowercase &&
      hasUppercase &&
      hasDigit &&
      hasSpecial &&
      noCyrillic,
  };
}

/** Те же правила, что при регистрации: длина, латиница, регистр, цифра, спецсимвол, без кириллицы. */
export const strongPasswordPairSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const checks = getPasswordValidationState(data.password);

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
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Пароли не совпадают.",
      });
    }
  });

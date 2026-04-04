/** Рамка поля «повтор пароля» — как в настройках. */
export function passwordRepeatBorderClass(opts: {
  fieldError?: boolean;
  mismatch: boolean;
  validForSave: boolean;
  match: boolean;
}): string {
  if (opts.fieldError || opts.mismatch) return "border-rose-400/50";
  if (opts.validForSave) return "border-emerald-400/45";
  if (opts.match) return "border-amber-400/40";
  return "border-white/10";
}

type PasswordRepeatHintProps = {
  confirm: string;
  password: string;
  passwordStrong: boolean;
  hintId?: string;
};

/** Подсказка под «Повторите пароль» — единый текст для настроек, регистрации, сброса. */
export function PasswordRepeatHint({
  confirm,
  password,
  passwordStrong,
  hintId = "password-repeat-hint",
}: PasswordRepeatHintProps) {
  const mismatch = confirm.length > 0 && password !== confirm;
  const match = confirm.length > 0 && password === confirm;
  const validForSave = match && passwordStrong;
  return (
    <p id={hintId} className="mt-1.5 min-h-[1.25rem] text-xs" aria-live="polite">
      {confirm.length < 1 ? (
        <span className="text-slate-500">Введите тот же новый пароль ещё раз для проверки.</span>
      ) : mismatch ? (
        <span className="text-rose-300/95">Пароли не совпадают.</span>
      ) : validForSave ? (
        <span className="text-emerald-300/95">Пароли совпадают, повтор верный.</span>
      ) : (
        <span className="text-amber-200/90">
          Совпадают, но новый пароль ещё не «сильный» — выполните требования выше.
        </span>
      )}
    </p>
  );
}

/** Рамка поля «новый пароль» при слабом пароле (янтарь). */
export function weakNewPasswordBorderClass(opts: {
  fieldError?: boolean;
  hasContent: boolean;
  isStrong: boolean;
}): string {
  if (opts.fieldError) return "border-rose-400/50";
  if (opts.hasContent && !opts.isStrong) return "border-amber-400/35";
  return "border-white/10";
}

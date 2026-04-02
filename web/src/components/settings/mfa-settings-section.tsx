"use client";

import clsx from "clsx";
import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FactorRow = { id: string; friendly_name?: string; factor_type: string; status: string };

export function MfaSettingsSection() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  const refreshFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setFactors([]);
      return;
    }
    const all = data?.all ?? [...(data?.totp ?? []), ...(data?.phone ?? [])];
    setFactors(all as FactorRow[]);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refreshFactors();
      setLoading(false);
    })();
  }, [refreshFactors]);

  const startTotpEnroll = async () => {
    setFeedback(null);
    setBusy(true);
    setEnrollQr(null);
    setPendingFactorId(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
      });
      if (error) {
        setFeedback({
          kind: "err",
          text:
            error.message.includes("MFA") || error.message.includes("mfa")
              ? `${error.message} Включите MFA в панели Supabase: Authentication → Providers → MFA.`
              : error.message,
        });
        return;
      }
      const totp = data?.totp as { qr_code?: string } | undefined;
      if (data?.id && totp?.qr_code) {
        setPendingFactorId(data.id);
        setEnrollQr(totp.qr_code);
        setFeedback({
          kind: "ok",
          text: "Отсканируйте QR в Google Authenticator, Authy или другом приложении, затем введите 6 цифр.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyTotp = async () => {
    if (!pendingFactorId || verifyCode.trim().length < 6) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pendingFactorId,
        code: verifyCode.trim().replace(/\s/g, ""),
      });
      if (error) {
        setFeedback({ kind: "err", text: error.message });
        return;
      }
      setFeedback({ kind: "ok", text: "Двухфакторная аутентификация включена." });
      setEnrollQr(null);
      setPendingFactorId(null);
      setVerifyCode("");
      await refreshFactors();
    } finally {
      setBusy(false);
    }
  };

  const unenroll = async (factorId: string) => {
    if (!window.confirm("Отключить этот способ входа?")) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setFeedback({ kind: "err", text: error.message });
        return;
      }
      setFeedback({ kind: "ok", text: "Фактор отключён." });
      await refreshFactors();
    } finally {
      setBusy(false);
    }
  };

  const verifiedTotp = factors.filter((f) => f.factor_type === "totp" && f.status === "verified");

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <ShieldCheck className="h-4 w-4" />
        Двухфакторный вход
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Одноразовые коды из приложения (TOTP): Google Authenticator, Microsoft Authenticator, Authy и т.п. При входе
        после пароля запросится код.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Загрузка…</p>
      ) : (
        <>
          {verifiedTotp.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {verifiedTotp.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0c101c] px-3 py-2"
                >
                  <span className="text-sm text-slate-200">{f.friendly_name ?? "Authenticator"} (TOTP)</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void unenroll(f.id)}
                    className="text-xs text-rose-300 hover:underline disabled:opacity-50"
                  >
                    Отключить
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!enrollQr && verifiedTotp.length === 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startTotpEnroll()}
              className="mt-4 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-60"
            >
              {busy ? "…" : "Подключить приложение-ключ"}
            </button>
          ) : null}

          {enrollQr ? (
            <div className="mt-4 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollQr} alt="QR для Authenticator" className="mx-auto max-h-48 rounded-lg border border-white/10 bg-white p-2" />
              <div>
                <label htmlFor="mfa-verify-code" className="text-xs text-slate-400">
                  Код из приложения
                </label>
                <input
                  id="mfa-verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="mt-1 w-full max-w-xs rounded-xl border border-white/10 bg-[#0c101c] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-500/30 focus:ring-2"
                  placeholder="000000"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || verifyCode.trim().length < 6}
                  onClick={() => void verifyTotp()}
                  className="rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
                >
                  Подтвердить
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEnrollQr(null);
                    setPendingFactorId(null);
                    setVerifyCode("");
                    setFeedback(null);
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}

          {feedback ? (
            <p className={clsx("mt-3 text-sm", feedback.kind === "ok" ? "text-emerald-300/95" : "text-rose-300/95")}>
              {feedback.text}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

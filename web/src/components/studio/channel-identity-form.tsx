"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { generateChannelHandleFromName } from "@/lib/channel-handle";

export function ChannelIdentityForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [currentHandle, setCurrentHandle] = useState("");
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/channel/identity");
      if (res.status === 401) {
        setLoading(false);
        return;
      }
      const j = (await res.json()) as {
        user_id?: string;
        channel_name?: string;
        channel_handle?: string;
        handle_changes_in_period?: number;
        handle_changes_limit?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Не удалось загрузить профиль.");
        setLoading(false);
        return;
      }
      setUserId(j.user_id ?? null);
      setChannelName(j.channel_name ?? "");
      setCurrentHandle(j.channel_handle ?? "");
      setUsed(j.handle_changes_in_period ?? 0);
      setLimit(j.handle_changes_limit ?? 3);
    } catch {
      setError("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewHandle = useMemo(() => {
    if (!userId || !channelName.trim()) return "";
    return generateChannelHandleFromName(channelName.trim(), userId);
  }, [channelName, userId]);

  const remaining = Math.max(0, limit - used);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/channel/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_name: channelName.trim(),
        }),
      });
      const j = (await res.json()) as { error?: string; channel_handle?: string; code?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось сохранить.");
        return;
      }
      setSuccess("Сохранено.");
      setCurrentHandle(j.channel_handle ?? "");
      if (j.channel_handle && !pathname?.startsWith("/studio")) {
        router.replace(`/@${j.channel_handle}`);
      }
      router.refresh();
      await load();
    } catch {
      setError("Ошибка сети.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#10182a] p-4 text-sm text-slate-400">Загрузка…</div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="rounded-xl border border-white/10 bg-[#10182a] p-4 sm:p-5">
      <h2 className="text-lg font-bold text-slate-100">Название канала</h2>
      <p className="mt-1 text-sm text-slate-400">
        Адрес страницы <span className="text-cyan-200/90">/@…</span> подставляется <strong className="text-slate-200">автоматически</strong> из
        названия (латинские буквы, цифры и суффикс — как внутри POTOK). Руками URL не редактируется.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Автосмен адреса за 30 дней: <span className="font-semibold text-slate-300">{used}</span> из {limit}.
        {remaining === 0 ? (
          <span className="text-amber-200/90">
            {" "}
            Лимит исчерпан — чтобы сменить адрес ещё раз, напишите администратору.
          </span>
        ) : (
          <span> Осталось автосмен: {remaining}.</span>
        )}
      </p>

      <div className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-200">Название канала</span>
          <input
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="w-full rounded-lg border border-white/12 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400/45"
            autoComplete="off"
            maxLength={80}
            placeholder="Например: Мой канал или My Channel"
          />
        </label>

        <div className="rounded-lg border border-white/10 bg-[#0b1120]/80 px-3 py-2.5">
          <p className="text-xs font-medium text-slate-500">Текущий адрес канала</p>
          <p className="mt-1 font-mono text-sm text-cyan-100">
            /@{currentHandle || "…"}
          </p>
          {previewHandle && previewHandle !== currentHandle ? (
            <p className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-400">
              После сохранения будет:{" "}
              <span className="font-mono text-amber-100/95">/@{previewHandle}</span>
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>
      ) : null}
      {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className={clsx(
            "rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60",
          )}
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

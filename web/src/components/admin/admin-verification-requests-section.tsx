"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

type Row = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  subscribers_count: number | null;
  channel_verification_request_message: string | null;
  channel_verification_request_at: string | null;
  channel_verification_request_status: string;
};

export function AdminVerificationRequestsSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const t = qApplied.trim();
      if (t.length >= 2) params.set("q", t);
      const res = await fetch(`/api/admin/channel-verification-requests?${params.toString()}`);
      const j = (await res.json()) as { requests?: Row[]; error?: string };
      if (!res.ok) {
        setRows([]);
        setError(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      setRows(j.requests ?? []);
    } catch {
      setRows([]);
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [qApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (userId: string, decision: "approved" | "rejected") => {
    const res = await fetch("/api/admin/channel-verification-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, decision }),
    });
    if (res.ok) void load();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-100">Заявки на галочку</h1>
      <p className="mt-1 text-sm text-slate-400">
        Авторы с достаточным числом подписчиков отправляют заявку из студии. Одобрение включает верификацию канала;
        отклонение — автор может подать заявку снова. Ниже — поиск по названию канала или нику (от 2 символов).
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-slate-500">Фильтр по названию / @нику</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQApplied(q.trim())}
            placeholder="от 2 символов"
          />
        </div>
        <button
          type="button"
          className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100"
          onClick={() => setQApplied(q.trim())}
        >
          Найти
        </button>
        {qApplied.length >= 2 ? (
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/5"
            onClick={() => {
              setQ("");
              setQApplied("");
            }}
          >
            Сбросить
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300/90">{error}</p> : null}

      {loading ? (
        <p className="mt-8 text-slate-400">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
          {qApplied.length >= 2
            ? "Никого не найдено по этому запросу среди заявок в ожидании."
            : "Нет заявок в ожидании."}
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">
                    {u.channel_name ?? "Без названия"}{" "}
                    {u.channel_handle ? (
                      <span className="text-cyan-200/80">@{u.channel_handle}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Подписчиков: {u.subscribers_count ?? 0} · id: {u.id}
                  </p>
                  {u.channel_verification_request_at ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Заявка: {new Date(u.channel_verification_request_at).toLocaleString("ru-RU")}
                    </p>
                  ) : null}
                  {u.channel_verification_request_message ? (
                    <p className="mt-2 whitespace-pre-wrap text-slate-300">{u.channel_verification_request_message}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.channel_handle ? (
                    <Link
                      href={`/@${u.channel_handle}`}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-cyan-200 hover:bg-white/5"
                    >
                      Канал
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className={clsx(
                      "rounded-lg border px-3 py-1.5 text-xs",
                      "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
                    )}
                    onClick={() => void decide(u.id, "approved")}
                  >
                    Одобрить (галочка)
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100"
                    onClick={() => void decide(u.id, "rejected")}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

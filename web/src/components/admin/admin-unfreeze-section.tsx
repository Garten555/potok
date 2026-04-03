"use client";

import { useCallback, useEffect, useState } from "react";

type UnfreezeRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  account_frozen_at: string | null;
  unfreeze_request_message: string | null;
  unfreeze_request_at: string | null;
  unfreeze_request_status: string;
};

export function AdminUnfreezeSection() {
  const [unfreeze, setUnfreeze] = useState<UnfreezeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUnfreeze = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/unfreeze-requests");
      if (!res.ok) {
        setUnfreeze([]);
        return;
      }
      const j = (await res.json()) as { requests?: UnfreezeRow[] };
      setUnfreeze(j.requests ?? []);
    } catch {
      setUnfreeze([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnfreeze();
  }, [loadUnfreeze]);

  const decide = async (userId: string, decision: "approved" | "rejected") => {
    const res = await fetch("/api/admin/unfreeze-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, decision }),
    });
    if (res.ok) void loadUnfreeze();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-100">Заявки на разморозку</h1>
      <p className="mt-1 text-sm text-slate-400">
        Пользователи с замороженным аккаунтом отправляют заявку. Одобрение снимает заморозку; отклонение оставляет аккаунт
        замороженным.
      </p>

      {loading ? (
        <p className="mt-8 text-slate-400">Загрузка...</p>
      ) : unfreeze.length === 0 ? (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
          Нет заявок в статусе «ожидает».
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {unfreeze.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">
                    {u.channel_name ?? "Без названия"}{" "}
                    {u.channel_handle ? <span className="text-cyan-200/80">@{u.channel_handle}</span> : null}
                  </p>
                  <p className="text-xs text-slate-500">id: {u.id}</p>
                  {u.unfreeze_request_at ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Заявка: {new Date(u.unfreeze_request_at).toLocaleString("ru-RU")}
                    </p>
                  ) : null}
                  {u.unfreeze_request_message ? (
                    <p className="mt-2 whitespace-pre-wrap text-slate-300">{u.unfreeze_request_message}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100"
                    onClick={() => void decide(u.id, "approved")}
                  >
                    Одобрить
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

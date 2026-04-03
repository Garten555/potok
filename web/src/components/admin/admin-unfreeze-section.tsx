"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

type UnfreezeRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  account_frozen_at: string | null;
  unfreeze_request_message: string | null;
  unfreeze_request_at: string | null;
  unfreeze_request_status: string;
};

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const STATUS_TAB_LABELS: { id: StatusFilter; label: string }[] = [
  { id: "pending", label: "Ожидают" },
  { id: "approved", label: "Одобрены" },
  { id: "rejected", label: "Отклонены" },
  { id: "all", label: "Все" },
];

function statusLabelRu(code: string): string {
  if (code === "pending") return "ожидает";
  if (code === "approved") return "одобрена";
  if (code === "rejected") return "отклонена";
  return code;
}

export function AdminUnfreezeSection() {
  const [unfreeze, setUnfreeze] = useState<UnfreezeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");

  const loadUnfreeze = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      const t = qApplied.trim();
      if (t.length >= 2) params.set("q", t);
      const res = await fetch(`/api/admin/unfreeze-requests?${params.toString()}`);
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
  }, [statusFilter, qApplied]);

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
        замороженным. Ниже можно смотреть историю по статусам и искать по названию канала или нику.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              statusFilter === tab.id
                ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-slate-500">Поиск по названию или @нику</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setQApplied(q.trim());
            }}
            placeholder="от 2 символов, затем «Найти»"
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
            Сбросить поиск
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-400">Загрузка...</p>
      ) : unfreeze.length === 0 ? (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
          {qApplied.length >= 2
            ? "Никого не найдено по этому запросу и фильтру."
            : statusFilter === "pending"
              ? "Нет заявок в статусе «ожидает»."
              : statusFilter === "approved"
                ? "Нет одобренных заявок в выборке."
                : statusFilter === "rejected"
                  ? "Нет отклонённых заявок в выборке."
                  : "Нет записей по выбранным условиям."}
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
                    {statusFilter === "all" ? (
                      <span className="ml-2 rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">
                        {statusLabelRu(u.unfreeze_request_status)}
                      </span>
                    ) : null}
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
                  {u.unfreeze_request_status === "pending" ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

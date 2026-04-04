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
  const [decidingUserId, setDecidingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUnfreeze = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      const t = qApplied.trim();
      if (t.length >= 2) params.set("q", t);
      const res = await fetch(`/api/admin/unfreeze-requests?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (!silent) setUnfreeze([]);
        return;
      }
      const j = (await res.json()) as { requests?: UnfreezeRow[] };
      setUnfreeze(j.requests ?? []);
    } catch {
      if (!silent) setUnfreeze([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, qApplied]);

  useEffect(() => {
    void loadUnfreeze();
  }, [loadUnfreeze]);

  const decide = async (userId: string, decision: "approved" | "rejected") => {
    setActionError(null);
    setDecidingUserId(userId);
    try {
      const res = await fetch("/api/admin/unfreeze-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, decision }),
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      setUnfreeze((prev) => prev.filter((row) => row.id !== userId));
      await loadUnfreeze({ silent: true });
    } finally {
      setDecidingUserId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-100">Заявки на разморозку</h1>
      <p className="mt-1 text-sm text-slate-400">
        Пользователи с замороженным аккаунтом подают заявку на восстановление доступа. Одобрение снимает заморозку; при
        отклонении аккаунт остаётся замороженным. Поиск заявок: <strong className="text-slate-300">@handle</strong> или{" "}
        <strong className="text-slate-300">подстрока</strong> ника (не менее 2 символов).
      </p>

      {actionError ? (
        <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {actionError}
        </p>
      ) : null}

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
          <label className="text-xs text-slate-500">Поиск: @handle или подстрока ника</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setQApplied(q.trim());
            }}
            placeholder="@handle или подстрока"
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
                        disabled={decidingUserId !== null}
                        className="rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-45"
                        onClick={() => void decide(u.id, "approved")}
                      >
                        {decidingUserId === u.id ? "…" : "Одобрить"}
                      </button>
                      <button
                        type="button"
                        disabled={decidingUserId !== null}
                        className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 disabled:opacity-45"
                        onClick={() => void decide(u.id, "rejected")}
                      >
                        {decidingUserId === u.id ? "…" : "Отклонить"}
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

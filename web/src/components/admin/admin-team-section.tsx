"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type StaffRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string;
  created_at?: string;
};

export function AdminTeamSection() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "moderator" | "admin">("all");
  const [newId, setNewId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/admin/moderators");
      const j = (await r.json()) as { error?: string; staff?: StaffRow[] };
      if (!r.ok) {
        setRows([]);
        setLoadError(j.error ?? `Ошибка ${r.status}`);
        return;
      }
      setRows(j.staff ?? []);
    } catch {
      setRows([]);
      setLoadError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const t = filterText.trim().toLowerCase();
    return rows.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!t) return true;
      const name = (u.channel_name ?? "").toLowerCase();
      const handle = (u.channel_handle ?? "").toLowerCase();
      const id = u.id.toLowerCase();
      return name.includes(t) || handle.includes(t) || id.includes(t);
    });
  }, [rows, filterText, roleFilter]);

  const setRole = async (userId: string, role: "moderator" | "user"): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setMsg({ kind: "err", text: j.error ?? "Ошибка" });
        return false;
      }
      setMsg({ kind: "ok", text: role === "moderator" ? "Назначен модератором." : "Роль снята." });
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const assignNew = async () => {
    const id = newId.trim();
    if (!id) return;
    const ok = await setRole(id, "moderator");
    if (ok) setNewId("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-100">Модераторы</h1>
      <p className="mt-1 text-sm text-slate-400">
        Список модераторов и администраторов платформы. Назначать и снимать роль модератора можно по UUID (из «Пользователи»).
        Роль администратора здесь не меняется — только через SQL.
      </p>

      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">Назначить модератора</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            className="min-w-[240px] flex-1 rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 font-mono text-sm text-slate-100"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="uuid пользователя"
          />
          <button
            type="button"
            disabled={busy || !newId.trim()}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium",
              "border border-amber-400/35 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 disabled:opacity-50",
            )}
            onClick={() => void assignNew()}
          >
            Назначить
          </button>
        </div>
        {msg ? (
          <p className={clsx("mt-2 text-sm", msg.kind === "ok" ? "text-emerald-300/90" : "text-rose-300/90")}>
            {msg.text}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-slate-500">Фильтр по имени, @handle или UUID</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Начните вводить…"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Роль</label>
          <select
            className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-2 text-sm text-slate-100"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "moderator" | "admin")}
          >
            <option value="all">Все</option>
            <option value="moderator">Модераторы</option>
            <option value="admin">Администраторы</option>
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          onClick={() => void load()}
        >
          Обновить список
        </button>
      </div>

      {loadError ? <p className="mt-4 text-sm text-rose-300/90">{loadError}</p> : null}

      {loading ? (
        <p className="mt-6 text-slate-500">Загрузка…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {filteredRows.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-500">
              {rows.length === 0
                ? "Нет записей с ролью модератор или администратор (кроме скрытых назначений через SQL)."
                : "Никто не подходит под фильтр."}
            </li>
          ) : (
            filteredRows.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-100">
                    {u.channel_name ?? "—"}
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        u.role === "admin"
                          ? "border border-amber-400/35 bg-amber-500/20 text-amber-100"
                          : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100",
                      )}
                    >
                      {u.role === "admin" ? "Админ" : "Модератор"}
                    </span>
                  </p>
                  {u.channel_handle ? <p className="text-cyan-200/80">@{u.channel_handle}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{u.id}</p>
                </div>
                {u.role === "moderator" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 disabled:opacity-50"
                    onClick={() => void setRole(u.id, "user")}
                  >
                    Снять роль
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Снять роль нельзя</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

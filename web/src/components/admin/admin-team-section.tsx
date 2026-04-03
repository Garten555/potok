"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

type ModRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string;
  created_at?: string;
};

export function AdminTeamSection() {
  const [rows, setRows] = useState<ModRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/moderators");
      if (!r.ok) {
        setRows([]);
        return;
      }
      const j = (await r.json()) as { moderators?: ModRow[] };
      setRows(j.moderators ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        Назначайте и снимайте роль модератора по UUID пользователя (из поиска в «Пользователи» или из Supabase). Роль
        администратора здесь не меняется — только через SQL.
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

      {loading ? (
        <p className="mt-8 text-slate-500">Загрузка…</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {rows.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-500">
              Пока нет модераторов (кроме назначений через SQL).
            </li>
          ) : (
            rows.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-100">{u.channel_name ?? "—"}</p>
                  {u.channel_handle ? <p className="text-cyan-200/80">@{u.channel_handle}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{u.id}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 disabled:opacity-50"
                  onClick={() => void setRole(u.id, "user")}
                >
                  Снять роль
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

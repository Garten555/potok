"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useAdminStaff } from "@/components/admin/admin-staff-context";
import { parseAdminUserSearchQuery } from "@/lib/admin-user-search";
import { isOwnerRole } from "@/lib/user-role";
import { ChannelAvatar } from "@/components/channel/channel-avatar";

type StaffRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string;
  created_at?: string;
};

type LookupUser = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  role: string | null;
};

export function AdminTeamSection() {
  const { viewerRole } = useAdminStaff();
  const isOwner = isOwnerRole(viewerRole);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "moderator" | "admin" | "owner">("all");
  const [assignTargetRole, setAssignTargetRole] = useState<"moderator" | "admin">("moderator");
  const [assignInput, setAssignInput] = useState("");
  const [assignPick, setAssignPick] = useState<LookupUser | null>(null);
  const [assignHits, setAssignHits] = useState<LookupUser[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const assignWrapRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (assignWrapRef.current && !assignWrapRef.current.contains(e.target as Node)) {
        setAssignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const raw = assignInput.trim();
    const parsed = parseAdminUserSearchQuery(raw);
    if (!parsed) {
      setAssignHits([]);
      setAssignPick(null);
      setAssignMenuOpen(false);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        setAssignLoading(true);
        try {
          const r = await fetch("/api/admin/user-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: raw }),
          });
          const j = (await r.json()) as {
            kind?: string;
            user?: LookupUser | null;
            users?: LookupUser[];
            error?: string;
          };
          if (!r.ok) {
            setAssignHits([]);
            setAssignPick(null);
            setAssignMenuOpen(false);
            return;
          }
          if (j.kind === "single") {
            const list = j.user ? [j.user] : [];
            setAssignHits(list);
            setAssignPick(j.user ?? null);
            setAssignMenuOpen(Boolean(j.user));
            return;
          }
          const list = j.users ?? [];
          setAssignHits(list);
          if (list.length === 1) {
            setAssignPick(list[0]);
          } else {
            setAssignPick(null);
          }
          setAssignMenuOpen(list.length > 0);
        } finally {
          setAssignLoading(false);
        }
      })();
    }, 280);
    return () => clearTimeout(t);
  }, [assignInput]);

  const filteredRows = useMemo(() => {
    const raw = filterText.trim();
    return rows.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!raw) return true;
      const parsed = parseAdminUserSearchQuery(raw);
      if (!parsed) return false;
      const term = parsed.term.toLowerCase();
      const name = (u.channel_name ?? "").toLowerCase();
      const handle = (u.channel_handle ?? "").toLowerCase();
      const id = u.id.toLowerCase();
      return name.includes(term) || handle.includes(term) || id.includes(term);
    });
  }, [rows, filterText, roleFilter]);

  const setRole = async (userId: string, role: "moderator" | "user" | "admin"): Promise<boolean> => {
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
      const okText =
        role === "moderator"
          ? "Назначен модератором."
          : role === "admin"
            ? "Назначен администратором."
            : "Роль обновлена.";
      setMsg({ kind: "ok", text: okText });
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const assignAmbiguous = assignHits.length > 1 && assignPick === null;

  const assignNew = async () => {
    const raw = (assignPick?.id ?? assignInput).trim();
    if (!raw || assignAmbiguous) return;
    const targetRole = isOwner && assignTargetRole === "admin" ? "admin" : "moderator";
    const ok = await setRole(raw, targetRole);
    if (ok) {
      setAssignInput("");
      setAssignPick(null);
      setAssignHits([]);
      setAssignMenuOpen(false);
    }
  };

  const pickAssignUser = (u: LookupUser) => {
    setAssignPick(u);
    setAssignInput(u.channel_handle ? `@${u.channel_handle}` : u.channel_name ?? u.id);
    setAssignMenuOpen(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-100">Команда</h1>
      <p className="mt-1 text-sm text-slate-400">
        Модераторы, администраторы и владелец платформы. Поиск и назначение — по{" "}
        <strong className="text-slate-200">@handle</strong> (как в URL канала, например{" "}
        <span className="font-mono text-cyan-200/90">@garten-f06e15</span>) или по части ника. Администратор назначает
        только <strong className="text-slate-200">модераторов</strong>; роль{" "}
        <strong className="text-slate-200">администратора</strong> выдаёт только{" "}
        <strong className="text-slate-200">владелец</strong>. Роль владельца (<code className="text-cyan-200/90">owner</code>
        ) меняется только через SQL.
      </p>

      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">
          {isOwner ? "Назначить модератора или администратора" : "Назначить модератора"}
        </p>
        <div ref={assignWrapRef} className="relative mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <input
              className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 font-mono text-sm text-slate-100"
              value={assignInput}
              onChange={(e) => {
                setAssignInput(e.target.value);
                setAssignPick(null);
              }}
              onFocus={() => assignHits.length > 0 && setAssignMenuOpen(true)}
              placeholder="@handle или часть ника — выберите из списка"
              autoComplete="off"
            />
            {assignMenuOpen && assignHits.length > 0 ? (
              <ul
                className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/15 bg-[#0f1628] py-1 shadow-xl"
                role="listbox"
              >
                {assignHits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-slate-100 hover:bg-white/[0.06]"
                      onClick={() => pickAssignUser(u)}
                    >
                      <ChannelAvatar
                        channelName={u.channel_name?.trim() || "Канал"}
                        avatarUrl={u.avatar_url}
                        className="!h-9 !w-9 !text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.channel_name ?? "—"}</span>
                        {u.channel_handle ? (
                          <span className="block truncate text-xs text-cyan-200/85">@{u.channel_handle}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {assignLoading ? (
              <p className="mt-1 text-[11px] text-slate-500">Поиск…</p>
            ) : null}
          </div>
          {isOwner ? (
            <div>
              <label className="text-xs text-slate-500">Роль при назначении</label>
              <select
                className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-2 text-sm text-slate-100"
                value={assignTargetRole}
                onChange={(e) => setAssignTargetRole(e.target.value as "moderator" | "admin")}
              >
                <option value="moderator">Модератор</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
          ) : null}
          <button
            type="button"
            disabled={busy || !(assignPick?.id ?? assignInput).trim() || assignAmbiguous}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium",
              "border border-amber-400/35 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 disabled:opacity-50",
            )}
            onClick={() => void assignNew()}
          >
            {isOwner && assignTargetRole === "admin" ? "Назначить админом" : "Назначить модератором"}
          </button>
        </div>
        {assignAmbiguous ? (
          <p className="mt-2 text-xs text-amber-200/85">Несколько совпадений — нажмите на нужный канал в списке.</p>
        ) : null}
        {msg ? (
          <p className={clsx("mt-2 text-sm", msg.kind === "ok" ? "text-emerald-300/90" : "text-rose-300/90")}>
            {msg.text}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-slate-500">Поиск: @handle или подстрока</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="@handle или подстрока"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Роль</label>
          <select
            className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-2 text-sm text-slate-100"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "moderator" | "admin" | "owner")}
          >
            <option value="all">Все</option>
            <option value="moderator">Модераторы</option>
            <option value="admin">Администраторы</option>
            <option value="owner">Владелец</option>
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
                ? "Нет записей с ролью персонала (модератор / админ / владелец)."
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
                        u.role === "owner"
                          ? "border border-violet-400/35 bg-violet-500/20 text-violet-100"
                          : u.role === "admin"
                            ? "border border-amber-400/35 bg-amber-500/20 text-amber-100"
                            : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100",
                      )}
                    >
                      {u.role === "owner" ? "Владелец" : u.role === "admin" ? "Админ" : "Модератор"}
                    </span>
                  </p>
                  {u.channel_handle ? <p className="text-cyan-200/80">@{u.channel_handle}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{u.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.role === "moderator" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 disabled:opacity-50"
                      onClick={() => void setRole(u.id, "user")}
                    >
                      Снять роль
                    </button>
                  ) : null}
                  {u.role === "admin" && isOwner ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 disabled:opacity-50"
                      onClick={() => void setRole(u.id, "user")}
                    >
                      Снять админа
                    </button>
                  ) : null}
                  {u.role === "owner" ? (
                    <span className="text-xs text-slate-500">Роль владельца только через SQL</span>
                  ) : null}
                  {u.role === "admin" && !isOwner ? (
                    <span className="text-xs text-slate-500">Снять админа может владелец</span>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

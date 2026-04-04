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

  const inputBase =
    "min-h-11 w-full min-w-0 rounded-xl border border-white/12 bg-[#0b1120] px-3.5 py-2.5 text-sm text-slate-100 shadow-inner outline-none ring-amber-500/0 transition placeholder:text-slate-500 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-500/25";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-100">Команда</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Модераторы, администраторы и владелец платформы. Поиск и назначение — по{" "}
          <strong className="text-slate-200">@handle</strong> (как в URL канала, например{" "}
          <span className="font-mono text-cyan-200/90">@garten-f06e15</span>) или по части ника. Администратор назначает
          только <strong className="text-slate-200">модераторов</strong>; роль{" "}
          <strong className="text-slate-200">администратора</strong> выдаёт только{" "}
          <strong className="text-slate-200">владелец</strong>. Роль владельца (
          <code className="text-cyan-200/90">owner</code>) меняется только через SQL.
        </p>
      </header>

      <section
        aria-labelledby="assign-heading"
        className="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-5 sm:p-6"
      >
        <h2 id="assign-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/90">
          {isOwner ? "Назначить модератора или администратора" : "Назначить модератора"}
        </h2>

        <div ref={assignWrapRef} className="relative mt-5 flex flex-col gap-5">
          <div className="w-full min-w-0">
            <label htmlFor="assign-user-search" className="mb-1.5 block text-xs font-medium text-slate-400">
              Канал (@handle или часть ника)
            </label>
            <input
              id="assign-user-search"
              className={clsx(inputBase, "font-mono text-[13px] leading-normal")}
              value={assignInput}
              onChange={(e) => {
                setAssignInput(e.target.value);
                setAssignPick(null);
              }}
              onFocus={() => assignHits.length > 0 && setAssignMenuOpen(true)}
              placeholder="@channel или фрагмент ника"
              autoComplete="off"
              spellCheck={false}
            />
            {assignMenuOpen && assignHits.length > 0 ? (
              <ul
                className="absolute z-30 mt-2 max-h-60 w-[calc(100%-0px)] overflow-auto rounded-xl border border-white/15 bg-[#0f1628] py-1 shadow-xl sm:max-w-xl"
                role="listbox"
              >
                {assignHits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-white/[0.06]"
                      onClick={() => pickAssignUser(u)}
                    >
                      <ChannelAvatar
                        channelName={u.channel_name?.trim() || "Канал"}
                        avatarUrl={u.avatar_url}
                        className="!h-10 !w-10 !text-xs shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.channel_name ?? "—"}</span>
                        {u.channel_handle ? (
                          <span className="block truncate font-mono text-xs text-cyan-200/85">@{u.channel_handle}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {assignLoading ? (
              <p className="mt-2 text-xs text-slate-500">Поиск…</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end sm:gap-5">
            {isOwner ? (
              <div className="w-full min-w-0 sm:max-w-[16rem] sm:flex-1">
                <label htmlFor="assign-role" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Роль при назначении
                </label>
                <select
                  id="assign-role"
                  className={clsx(inputBase, "cursor-pointer pr-9")}
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
                "min-h-11 w-full shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium sm:min-w-[12.5rem] sm:w-auto",
                "border border-amber-400/40 bg-amber-500/25 text-amber-50 hover:bg-amber-500/35 disabled:opacity-50",
              )}
              onClick={() => void assignNew()}
            >
              {isOwner && assignTargetRole === "admin" ? "Назначить админом" : "Назначить модератором"}
            </button>
          </div>
        </div>

        {assignAmbiguous ? (
          <p className="mt-4 text-xs text-amber-200/90">
            Несколько совпадений — выберите нужный канал в списке выше.
          </p>
        ) : null}
        {msg ? (
          <p className={clsx("mt-4 text-sm", msg.kind === "ok" ? "text-emerald-300/90" : "text-rose-300/90")}>
            {msg.text}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="filter-heading" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 id="filter-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Фильтр списка
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_auto] sm:items-end">
          <div className="min-w-0">
            <label htmlFor="team-filter-q" className="mb-1.5 block text-xs font-medium text-slate-400">
              Поиск по @handle или подстроке
            </label>
            <input
              id="team-filter-q"
              className={inputBase}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Например: garten или @handle"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="team-filter-role" className="mb-1.5 block text-xs font-medium text-slate-400">
              Роль
            </label>
            <select
              id="team-filter-role"
              className={clsx(inputBase, "cursor-pointer")}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | "moderator" | "admin" | "owner")}
            >
              <option value="all">Все</option>
              <option value="moderator">Модераторы</option>
              <option value="admin">Администраторы</option>
              <option value="owner">Владелец</option>
            </select>
          </div>
          <div className="flex sm:justify-end">
            <button
              type="button"
              className="min-h-11 w-full rounded-xl border border-white/12 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.06] sm:w-auto"
              onClick={() => void load()}
            >
              Обновить список
            </button>
          </div>
        </div>
      </section>

      {loadError ? <p className="mt-4 text-sm text-rose-300/90">{loadError}</p> : null}

      {loading ? (
        <p className="mt-6 text-slate-500">Загрузка…</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {filteredRows.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-6 text-sm text-slate-500">
              {rows.length === 0
                ? "Нет записей с ролью персонала (модератор / админ / владелец)."
                : "Никто не подходит под фильтр."}
            </li>
          ) : (
            filteredRows.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm"
              >
                <div className="min-w-0 flex-1">
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
                  {u.channel_handle ? (
                    <p className="truncate font-mono text-sm text-cyan-200/80">@{u.channel_handle}</p>
                  ) : null}
                  <p className="mt-2 break-all font-mono text-[10px] leading-snug text-slate-500">{u.id}</p>
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

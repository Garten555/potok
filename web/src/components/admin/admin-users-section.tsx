"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { BadgeCheck } from "lucide-react";

const ROLE_LABELS_RU: Record<string, string> = {
  user: "Пользователь",
  moderator: "Модератор",
  admin: "Администратор",
};

function roleLabelRu(role: string | null | undefined): string {
  const r = role ?? "user";
  return ROLE_LABELS_RU[r] ?? r;
}

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string | null;
  banned_until: string | null;
  account_frozen_at: string | null;
  channel_verified?: boolean | null;
};

export function AdminUsersSection() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [single, setSingle] = useState<{ user: UserRow | null; email?: string | null } | null>(null);
  const [list, setList] = useState<UserRow[] | null>(null);
  const [verifySaving, setVerifySaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "moderator" | "admin">("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "yes" | "no">("all");

  const [browsePage, setBrowsePage] = useState(1);
  const [browseRole, setBrowseRole] = useState<"all" | "user" | "moderator" | "admin">("all");
  const [browseVerified, setBrowseVerified] = useState<"all" | "yes" | "no">("all");
  const [browseQ, setBrowseQ] = useState("");
  /** Подстрока поиска, уходящая в API (обновляется по «Применить» / Enter). */
  const [browseQApplied, setBrowseQApplied] = useState("");
  const [browseUsers, setBrowseUsers] = useState<UserRow[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const browsePageSize = 20;

  const loadBrowse = useCallback(async () => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(browsePage));
      params.set("limit", String(browsePageSize));
      if (browseRole !== "all") params.set("role", browseRole);
      if (browseVerified !== "all") params.set("verified", browseVerified);
      const t = browseQApplied.trim();
      if (t.length >= 2) params.set("q", t);
      const res = await fetch(`/api/admin/users-browse?${params.toString()}`);
      const j = (await res.json()) as { users?: UserRow[]; total?: number; error?: string };
      if (!res.ok) {
        setBrowseUsers([]);
        setBrowseTotal(0);
        setBrowseError(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      setBrowseUsers(j.users ?? []);
      setBrowseTotal(typeof j.total === "number" ? j.total : j.users?.length ?? 0);
    } catch {
      setBrowseUsers([]);
      setBrowseTotal(0);
      setBrowseError("Сеть недоступна");
    } finally {
      setBrowseLoading(false);
    }
  }, [browsePage, browseRole, browseVerified, browseQApplied, browsePageSize]);

  useEffect(() => {
    void loadBrowse();
  }, [loadBrowse]);

  const search = async () => {
    const term = q.trim();
    if (term.length < 2) {
      setError("Минимум 2 символа");
      return;
    }
    setLoading(true);
    setError(null);
    setSingle(null);
    setList(null);
    try {
      const res = await fetch("/api/admin/user-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: term }),
      });
      const j = (await res.json()) as {
        error?: string;
        kind?: string;
        user?: UserRow | null;
        users?: UserRow[];
        email?: string | null;
      };
      if (!res.ok) {
        setError(j.error ?? "Ошибка запроса");
        return;
      }
      if (j.kind === "single") {
        setSingle({ user: j.user ?? null, email: j.email });
      } else {
        setList(j.users ?? []);
      }
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  };

  const setVerified = async (userId: string, verified: boolean) => {
    setVerifySaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/channel-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, verified }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось обновить верификацию");
        return;
      }
      setSingle((prev) =>
        prev?.user && prev.user.id === userId
          ? { ...prev, user: { ...prev.user, channel_verified: verified } }
          : prev,
      );
      setList((prev) =>
        prev
          ? prev.map((u) => (u.id === userId ? { ...u, channel_verified: verified } : u))
          : prev,
      );
    } catch {
      setError("Сеть недоступна");
    } finally {
      setVerifySaving(false);
    }
  };

  const filteredList = useMemo(() => {
    if (!list) return null;
    return list.filter((u) => {
      const r = u.role ?? "user";
      if (roleFilter !== "all" && r !== roleFilter) return false;
      const v = Boolean(u.channel_verified);
      if (verifiedFilter === "yes" && !v) return false;
      if (verifiedFilter === "no" && v) return false;
      return true;
    });
  }, [list, roleFilter, verifiedFilter]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-100">Пользователи</h1>
      <p className="mt-1 text-sm text-slate-400">
        Ниже — список пользователей с фильтрами и страницами. Отдельно: точный поиск по UUID, @handle или части ника;
        для точного UUID показываем карточку и email из auth (если доступен service role на сервере).
      </p>

      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
        <h2 className="text-sm font-medium text-cyan-100/90">Список пользователей</h2>
        <p className="mt-1 text-xs text-slate-500">
          Фильтры по роли и верификации; в поле «Подстрока» — от 2 символов по нику или @handle (или оставьте пустым для
          всех).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-slate-500">Роль</label>
            <select
              className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
              value={browseRole}
              onChange={(e) => {
                setBrowseRole(e.target.value as typeof browseRole);
                setBrowsePage(1);
              }}
            >
              <option value="all">Все</option>
              <option value="user">Пользователь</option>
              <option value="moderator">Модератор</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Верификация</label>
            <select
              className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
              value={browseVerified}
              onChange={(e) => {
                setBrowseVerified(e.target.value as typeof browseVerified);
                setBrowsePage(1);
              }}
            >
              <option value="all">Все</option>
              <option value="yes">С галочкой</option>
              <option value="no">Без галочки</option>
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-xs text-slate-500">Подстрока ника / handle</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-1.5 text-sm text-slate-100"
              value={browseQ}
              onChange={(e) => setBrowseQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setBrowseQApplied(browseQ.trim());
                  setBrowsePage(1);
                }
              }}
              placeholder="от 2 символов или пусто"
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
            onClick={() => {
              setBrowseQApplied(browseQ.trim());
              setBrowsePage(1);
            }}
          >
            Применить
          </button>
        </div>

        {browseError ? <p className="mt-3 text-sm text-rose-300/90">{browseError}</p> : null}
        {browseLoading ? (
          <p className="mt-4 text-sm text-slate-500">Загрузка…</p>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {browseUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0b1120]/80 px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-100">{u.channel_name ?? "—"}</span>{" "}
                    {u.channel_verified ? (
                      <BadgeCheck className="inline h-4 w-4 align-middle text-cyan-400" aria-hidden />
                    ) : null}{" "}
                    {u.channel_handle ? (
                      <span className="text-cyan-200/80">@{u.channel_handle}</span>
                    ) : null}
                    <span className="ml-2 text-xs text-slate-500">{roleLabelRu(u.role)}</span>
                  </div>
                  {u.channel_handle ? (
                    <Link href={`/@${u.channel_handle}`} className="text-xs text-cyan-300 hover:underline">
                      Канал
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
            {browseTotal > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Всего: {browseTotal}
                  {browseTotal > browsePageSize
                    ? ` · стр. ${browsePage} из ${Math.max(1, Math.ceil(browseTotal / browsePageSize))}`
                    : null}
                </p>
                {browseTotal > browsePageSize ? (
                  <>
                    <button
                      type="button"
                      disabled={browsePage <= 1}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
                      onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
                    >
                      Назад
                    </button>
                    <button
                      type="button"
                      disabled={browsePage >= Math.ceil(browseTotal / browsePageSize)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
                      onClick={() => setBrowsePage((p) => p + 1)}
                    >
                      Вперёд
                    </button>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Нет записей по выбранным условиям.</p>
            )}
          </>
        )}
      </div>

      <h2 className="mt-10 text-lg font-medium text-slate-200">Точный поиск</h2>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="text-xs text-slate-500">Запрос</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="UUID, @handle или часть имени канала"
            onKeyDown={(e) => e.key === "Enter" && void search()}
          />
        </div>
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
          onClick={() => void search()}
        >
          {loading ? "Поиск…" : "Найти"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300/90">{error}</p> : null}

      {single ? (
        <div className="mt-8">
          {!single.user ? (
            <p className="text-slate-500">Пользователь не найден.</p>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-medium text-slate-100">{single.user.channel_name ?? "—"}</p>
                {single.user.channel_verified ? (
                  <span title="Верифицирован">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                  </span>
                ) : null}
              </div>
              {single.user.channel_handle ? (
                <p className="text-cyan-200/85">@{single.user.channel_handle}</p>
              ) : null}
              {single.email ? <p className="mt-2 text-xs text-slate-500">Email: {single.email}</p> : null}
              <p className="mt-2 font-mono text-xs text-slate-500">id: {single.user.id}</p>
              <dl className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Роль</dt>
                  <dd className="text-slate-200">{roleLabelRu(single.user.role)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Бан до</dt>
                  <dd className="text-slate-200">
                    {single.user.banned_until
                      ? new Date(single.user.banned_until).toLocaleString("ru-RU")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Заморозка</dt>
                  <dd className={clsx(single.user.account_frozen_at ? "text-amber-200" : "text-slate-200")}>
                    {single.user.account_frozen_at
                      ? new Date(single.user.account_frozen_at).toLocaleString("ru-RU")
                      : "нет"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-[#0b1120] text-cyan-500 focus:ring-cyan-500/40"
                    checked={Boolean(single.user.channel_verified)}
                    disabled={verifySaving}
                    onChange={(e) => void setVerified(single.user!.id, e.target.checked)}
                  />
                  Верификация канала (галочка на сайте)
                </label>
                {verifySaving ? <span className="text-xs text-slate-500">Сохранение…</span> : null}
              </div>
              {single.user.channel_handle ? (
                <Link
                  href={`/@${single.user.channel_handle}`}
                  className="mt-4 inline-block text-sm text-cyan-300 hover:underline"
                >
                  Открыть канал →
                </Link>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {list ? (
        <div className="mt-8">
          {list.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-slate-500">Роль</label>
                <select
                  className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                >
                  <option value="all">Все</option>
                  <option value="user">Пользователь</option>
                  <option value="moderator">Модератор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Верификация</label>
                <select
                  className="mt-1 rounded-lg border border-white/10 bg-[#0b1120] px-2 py-1.5 text-sm text-slate-100"
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value as typeof verifiedFilter)}
                >
                  <option value="all">Все</option>
                  <option value="yes">С галочкой</option>
                  <option value="no">Без галочки</option>
                </select>
              </div>
            </div>
          ) : null}
          {list.length === 0 ? (
            <p className="text-slate-500">Ничего не найдено.</p>
          ) : filteredList?.length === 0 ? (
            <p className="text-slate-500">Никто не подходит под фильтр роли или верификации.</p>
          ) : (
            <ul className="space-y-2">
            {(filteredList ?? []).map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-100">{u.channel_name ?? "—"}</span>{" "}
                  {u.channel_verified ? (
                    <BadgeCheck className="inline h-4 w-4 align-middle text-cyan-400" aria-hidden />
                  ) : null}{" "}
                  {u.channel_handle ? (
                    <span className="text-cyan-200/80">@{u.channel_handle}</span>
                  ) : null}
                  <span className="ml-2 text-xs text-slate-500">{roleLabelRu(u.role)}</span>
                </div>
                {u.channel_handle ? (
                  <Link href={`/@${u.channel_handle}`} className="text-xs text-cyan-300 hover:underline">
                    Канал
                  </Link>
                ) : null}
              </li>
            ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

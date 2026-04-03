"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string | null;
  banned_until: string | null;
  account_frozen_at: string | null;
};

export function AdminUsersSection() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [single, setSingle] = useState<{ user: UserRow | null; email?: string | null } | null>(null);
  const [list, setList] = useState<UserRow[] | null>(null);

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

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-100">Пользователи</h1>
      <p className="mt-1 text-sm text-slate-400">
        Поиск по UUID пользователя, @handle или части ника. Для точного UUID показываем карточку и email из auth (если
        доступен service role на сервере).
      </p>

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
              <p className="text-lg font-medium text-slate-100">{single.user.channel_name ?? "—"}</p>
              {single.user.channel_handle ? (
                <p className="text-cyan-200/85">@{single.user.channel_handle}</p>
              ) : null}
              {single.email ? <p className="mt-2 text-xs text-slate-500">Email: {single.email}</p> : null}
              <p className="mt-2 font-mono text-xs text-slate-500">id: {single.user.id}</p>
              <dl className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Роль</dt>
                  <dd className="text-slate-200">{single.user.role ?? "—"}</dd>
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
        <ul className="mt-8 space-y-2">
          {list.length === 0 ? (
            <p className="text-slate-500">Ничего не найдено.</p>
          ) : (
            list.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-100">{u.channel_name ?? "—"}</span>{" "}
                  {u.channel_handle ? (
                    <span className="text-cyan-200/80">@{u.channel_handle}</span>
                  ) : null}
                  <span className="ml-2 text-xs text-slate-500">{u.role}</span>
                </div>
                {u.channel_handle ? (
                  <Link href={`/@${u.channel_handle}`} className="text-xs text-cyan-300 hover:underline">
                    Канал
                  </Link>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

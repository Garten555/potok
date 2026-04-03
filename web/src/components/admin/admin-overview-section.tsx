"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isAdminRole } from "@/lib/user-role";

type Stats = {
  reports_open: number;
  reports_reviewing: number;
  reports_last_7d: number;
  users_total: number;
  videos_total: number;
  verified_channels: number;
  pending_unfreeze: number | null;
  viewerRole: string | null;
};

export function AdminOverviewSection({ viewerRole }: { viewerRole: string | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/admin/stats");
        if (!r.ok) {
          if (!cancelled) setErr("Не удалось загрузить сводку");
          return;
        }
        const j = (await r.json()) as Stats;
        if (!cancelled) {
          setStats(j);
          setErr(null);
        }
      } catch {
        if (!cancelled) setErr("Ошибка сети");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const admin = isAdminRole(viewerRole);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-100">Обзор</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Сводка по модерации и быстрые переходы. Раздел «Разморозка» и расширенные действия по пользователям — у
        администраторов.
      </p>

      {err ? <p className="mt-6 text-sm text-rose-300/90">{err}</p> : null}

      {stats ? (
        <div
          className={clsx(
            "mt-8 grid gap-4",
            "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
          )}
        >
          <StatCard label="Жалобы открыты" value={stats.reports_open} hint="Статус open" accent="cyan" />
          <StatCard label="На рассмотрении" value={stats.reports_reviewing} hint="Статус reviewing" accent="amber" />
          <StatCard
            label="Жалоб за 7 дней"
            value={stats.reports_last_7d}
            hint="Созданы за последнюю неделю"
            accent="violet"
          />
          <StatCard label="Пользователей" value={stats.users_total} hint="Всего в базе" accent="sky" />
          <StatCard label="Видео" value={stats.videos_total} hint="Всего загрузок" accent="rose" />
          <StatCard
            label="Верифицировано"
            value={stats.verified_channels}
            hint="Каналов с галочкой"
            accent="emerald"
          />
          {admin && stats.pending_unfreeze !== null ? (
            <StatCard
              label="Заявок на разморозку"
              value={stats.pending_unfreeze}
              hint="Ожидают решения"
              accent="amber"
            />
          ) : null}
        </div>
      ) : !err ? (
        <p className="mt-8 text-slate-500">Загрузка метрик…</p>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">Модерация</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              →{" "}
              <Link href="/admin/reports" className="text-cyan-300 hover:underline">
                Очередь жалоб
              </Link>
            </li>
            <li>
              →{" "}
              <Link href="/admin/users" className="text-cyan-300 hover:underline">
                Пользователи: поиск и верификация канала (галочка)
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Администрирование</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {admin ? (
              <>
                <li>
                  →{" "}
                  <Link href="/admin/unfreeze" className="text-amber-200/90 hover:underline">
                    Заявки на разморозку аккаунтов
                  </Link>
                </li>
                <li>
                  →{" "}
                  <Link href="/admin/team" className="text-amber-200/90 hover:underline">
                    Назначить модераторов
                  </Link>
                </li>
              </>
            ) : (
              <li className="text-slate-500">Расширенные действия (разморозка, бан по жалобе) — у администратора.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: "cyan" | "amber" | "violet" | "emerald" | "sky" | "rose";
}) {
  const ring =
    accent === "cyan"
      ? "border-cyan-500/25 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
      : accent === "amber"
        ? "border-amber-500/25 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
        : accent === "violet"
          ? "border-violet-500/25 shadow-[0_0_0_1px_rgba(167,139,250,0.12)]"
          : accent === "sky"
            ? "border-sky-500/25 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
            : accent === "rose"
              ? "border-rose-500/25 shadow-[0_0_0_1px_rgba(251,113,133,0.12)]"
              : "border-emerald-500/25 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]";

  const numCls =
    accent === "cyan"
      ? "text-cyan-200"
      : accent === "amber"
        ? "text-amber-200"
        : accent === "violet"
          ? "text-violet-200"
          : accent === "sky"
            ? "text-sky-200"
            : accent === "rose"
              ? "text-rose-200"
              : "text-emerald-200";

  return (
    <div className={`rounded-2xl border bg-[#0b0e16]/80 p-4 ${ring}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${numCls}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

"use client";

type ReportsByStatus = {
  open: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
};

type AdminStatsChartsProps = {
  reportsByStatus: ReportsByStatus;
};

const LABELS: { key: keyof ReportsByStatus; label: string; color: string }[] = [
  { key: "open", label: "Открыты", color: "bg-cyan-500/80" },
  { key: "reviewing", label: "На рассмотрении", color: "bg-amber-500/80" },
  { key: "resolved", label: "Закрыты", color: "bg-emerald-500/75" },
  { key: "dismissed", label: "Отклонены", color: "bg-slate-500/70" },
];

export function AdminStatsCharts({ reportsByStatus }: AdminStatsChartsProps) {
  const total =
    reportsByStatus.open +
    reportsByStatus.reviewing +
    reportsByStatus.resolved +
    reportsByStatus.dismissed;
  const maxCount = Math.max(
    reportsByStatus.open,
    reportsByStatus.reviewing,
    reportsByStatus.resolved,
    reportsByStatus.dismissed,
    1,
  );

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-[#0b0e16]/80 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Жалобы по статусам</h2>
      <p className="mt-1 text-xs text-slate-500">Распределение всех жалоб в базе — наглядно для приоритетов.</p>
      <div className="mt-6 space-y-3">
        {LABELS.map(({ key, label, color }) => {
          const n = reportsByStatus[key];
          const pct = Math.round((n / maxCount) * 100);
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span className="tabular-nums text-slate-300">{n}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all ${color}`}
                  style={{ width: `${n === 0 ? 0 : Math.max(pct, 6)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-slate-600">Всего записей жалоб: {total}</p>
    </div>
  );
}

type PlatformProps = {
  users: number;
  videos: number;
  verified: number;
};

const PLATFORM: { key: keyof PlatformProps; label: string; color: string }[] = [
  { key: "users", label: "Пользователи", color: "bg-sky-500/75" },
  { key: "videos", label: "Видео", color: "bg-rose-500/70" },
  { key: "verified", label: "Верифицированные каналы", color: "bg-emerald-500/70" },
];

export function AdminPlatformBars({ users, videos, verified }: PlatformProps) {
  const data = { users, videos, verified };
  const maxCount = Math.max(users, videos, verified, 1);
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b0e16]/80 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Платформа</h2>
      <p className="mt-1 text-xs text-slate-500">Масштаб относительно наибольшего показателя.</p>
      <div className="mt-6 space-y-3">
        {PLATFORM.map(({ key, label, color }) => {
          const n = data[key];
          const pct = Math.round((n / maxCount) * 100);
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span className="tabular-nums text-slate-300">{n}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all ${color}`}
                  style={{ width: `${n === 0 ? 0 : Math.max(pct, 6)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

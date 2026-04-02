"use client";

import { useState } from "react";
import { Eye, Play, UserRound } from "lucide-react";

type SeriesPoint = {
  label: string;
  value: number;
};

export type ChannelStatsProps = {
  subscribersCount: number;
  totalViews: number;
  videosCount: number;
  viewsSeries: SeriesPoint[];
  subsSeries: SeriesPoint[];
};

function LineChart({
  title,
  series,
  stroke = "#2dd4ff",
  valueUnit,
}: {
  title: string;
  series: SeriesPoint[];
  stroke?: string;
  valueUnit: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinIdx, setPinIdx] = useState<number | null>(null);
  const showIdx = pinIdx ?? hoverIdx;
  const w = 300;
  const h = 160;
  const padL = 28;
  const padR = 10;
  const padT = 14;
  const padB = 26;

  const values = series.map((s) => s.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;

  const xStep = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const yFor = (v: number) => padT + (h - padT - padB) * (1 - (v - min) / span);

  const points = series
    .map((s, i) => {
      const x = padL + i * xStep;
      const y = yFor(s.value);
      return { x, y, label: s.label, value: s.value };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1120]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>

      <div className="mt-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full">
          {gridLines.map((i) => {
            const t = i / gridCount;
            const y = padT + (h - padT - padB) * t;
            return (
              <g key={i}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />
              </g>
            );
          })}

          {path ? <path d={path} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" /> : null}

          {points.map((p, i) => (
            <g
              key={`pt-${i}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => setPinIdx((prev) => (prev === i ? null : i))}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={showIdx === i ? 6 : 3.5}
                fill={stroke}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={1}
              />
              <title>
                {p.label}: {p.value.toLocaleString("ru-RU")} {valueUnit}
              </title>
            </g>
          ))}

          {points.map((p, i) => {
            // Чтобы не засорять подписи, показываем все при <= 6, иначе каждые 2.
            const showEvery = series.length <= 6 ? 1 : 2;
            if (i % showEvery !== 0) return null;
            const x = p.x;
            return (
              <text
                key={`t-${i}`}
                x={x}
                y={h - 10}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(148,163,184,0.95)"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
        <p className="mt-2 min-h-[2.5rem] px-1 text-center text-xs leading-snug">
          {showIdx !== null ? (
            <span className="text-cyan-200/95">
              <span className="font-semibold text-slate-100">{series[showIdx].label}</span>
              {": "}
              {series[showIdx].value.toLocaleString("ru-RU")} {valueUnit}
              {pinIdx !== null ? (
                <span className="block pt-0.5 text-[11px] font-normal text-slate-500">
                  Повторный клик снимает выделение
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-slate-500">Наведите на точку или нажмите — покажем значение за месяц</span>
          )}
        </p>
      </div>
    </div>
  );
}

function BarChart({
  title,
  series,
  valueUnit,
}: {
  title: string;
  series: SeriesPoint[];
  valueUnit: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinIdx, setPinIdx] = useState<number | null>(null);
  const showIdx = pinIdx ?? hoverIdx;
  const w = 300;
  const h = 160;
  const padL = 18;
  const padR = 10;
  const padT = 14;
  const padB = 26;

  const values = series.map((s) => s.value);
  const max = Math.max(...values, 1);

  const bars = series.map((s, i) => {
    const x0 = padL + ((w - padL - padR) / Math.max(1, series.length)) * i;
    const x1 =
      padL + ((w - padL - padR) / Math.max(1, series.length)) * (i + 1) - 6;
    const barW = Math.max(2, x1 - x0);
    const barH = ((h - padT - padB) * s.value) / max;
    const y = h - padB - barH;
    return { x: x0, y, w: barW, h: barH, label: s.label, value: s.value, i };
  });

  const xStepLabelEvery = series.length <= 6 ? 1 : 2;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1120]/40 p-3">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mt-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full">
          {Array.from({ length: 4 + 1 }, (_, i) => i).map((i) => {
            const t = i / 4;
            const y = padT + (h - padT - padB) * t;
            return <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />;
          })}

          {bars.map((b) => (
            <g
              key={b.i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(b.i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => setPinIdx((prev) => (prev === b.i ? null : b.i))}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={4}
                fill={showIdx === b.i ? "rgba(45,212,255,0.85)" : "rgba(45,212,255,0.55)"}
                stroke="rgba(45,212,255,0.95)"
                strokeWidth={showIdx === b.i ? 2 : 1}
              />
              <title>
                {b.label}: {b.value.toLocaleString("ru-RU")} {valueUnit}
              </title>
            </g>
          ))}

          {bars.map((b, i) => {
            if (i % xStepLabelEvery !== 0) return null;
            return (
              <text
                key={`tb-${i}`}
                x={b.x + b.w / 2}
                y={h - 10}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(148,163,184,0.95)"
              >
                {b.label}
              </text>
            );
          })}
        </svg>
        <p className="mt-2 min-h-[2.5rem] px-1 text-center text-xs leading-snug">
          {showIdx !== null ? (
            <span className="text-cyan-200/95">
              <span className="font-semibold text-slate-100">{series[showIdx].label}</span>
              {": "}
              {series[showIdx].value.toLocaleString("ru-RU")} {valueUnit}
              {pinIdx !== null ? (
                <span className="block pt-0.5 text-[11px] font-normal text-slate-500">
                  Повторный клик снимает выделение
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-slate-500">Наведите на столбец или нажмите — значение за месяц</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function ChannelStats({
  subscribersCount,
  totalViews,
  videosCount,
  viewsSeries,
  subsSeries,
}: ChannelStatsProps) {
  const format = (n: number) => n.toLocaleString("ru-RU");

  return (
    <section className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 via-[#0c1323]/30 to-[#0c1323]/10 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-100">Статистика канала</h2>
      <p className="mt-1 text-xs text-slate-500">
        Сводка по вашему каналу. Глобальная модерация — у ролей admin/moderator в{" "}
        <span className="text-slate-400">/admin</span>.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1120]/60 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-500/15">
            <UserRound className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">Подписчики</p>
            <p className="truncate text-lg font-semibold text-slate-100">{format(subscribersCount)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1120]/60 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-500/15">
            <Eye className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">Просмотры</p>
            <p className="truncate text-lg font-semibold text-slate-100">{format(totalViews)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1120]/60 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-500/15">
            <Play className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">Видео</p>
            <p className="truncate text-lg font-semibold text-slate-100">{format(videosCount)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="min-w-0 overflow-x-auto">
          <LineChart title="Просмотры по месяцам" series={viewsSeries} valueUnit="просмотров" />
        </div>
        <div className="min-w-0 overflow-x-auto">
          <BarChart title="Новые подписки по месяцам" series={subsSeries} valueUnit="новых подписок" />
        </div>
      </div>
    </section>
  );
}


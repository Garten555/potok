"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChannelSpotlightLinksForm } from "@/components/studio/channel-spotlight-editor";
import type { ChannelHomeLayoutRow, ChannelPlaylistCard } from "@/lib/channel-home-types";

export type ChannelHomeLayoutEditorProps = {
  channelUserId: string;
  channelPlaylists: ChannelPlaylistCard[];
  initialRows: ChannelHomeLayoutRow[];
  onSaved?: () => void;
};

const MAX_SECTIONS = 12;

type DraftItem = {
  key: string;
  kind: "uploads" | "playlist" | "spotlight";
  playlistId: string | null;
  title: string;
};

function rowsToDraft(rows: ChannelHomeLayoutRow[]): DraftItem[] {
  return rows.map((r, i) => ({
    key: r.id ?? `draft-${i}`,
    kind: r.sectionKind,
    playlistId: r.playlistId,
    title: r.displayTitle?.trim() ?? "",
  }));
}

function defaultDraft(): DraftItem[] {
  return [{ key: "new-0", kind: "uploads", playlistId: null, title: "Видео" }];
}

export function ChannelHomeLayoutEditor({
  channelUserId,
  channelPlaylists,
  initialRows,
  onSaved,
}: ChannelHomeLayoutEditorProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState<DraftItem[]>(() =>
    initialRows.length ? rowsToDraft(initialRows) : defaultDraft(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(initialRows.length ? rowsToDraft(initialRows) : defaultDraft());
  }, [initialRows]);

  const uploadsCount = draft.filter((d) => d.kind === "uploads").length;
  const spotlightCount = draft.filter((d) => d.kind === "spotlight").length;
  const usedPlaylistIds = new Set(
    draft.filter((d) => d.kind === "playlist" && d.playlistId).map((d) => d.playlistId as string),
  );

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= draft.length) return;
    setDraft((prev) => {
      const copy = [...prev];
      const t = copy[index];
      copy[index] = copy[next];
      copy[next] = t;
      return copy;
    });
  };

  const remove = (index: number) => {
    const row = draft[index];
    if (row?.kind === "uploads") {
      setError(
        "Раздел «Все видео» нельзя удалить: это обязательный ряд загрузок на главной. Вкладка «Видео» в меню канала всегда доступна отдельно и не удаляется.",
      );
      return;
    }
    setError("");
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const addUploads = () => {
    if (draft.length >= MAX_SECTIONS) return;
    if (draft.some((d) => d.kind === "uploads")) {
      setError("Раздел «Все видео» может быть только один.");
      return;
    }
    setError("");
    setDraft((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, kind: "uploads", playlistId: null, title: "Видео" },
    ]);
  };

  const addSpotlight = () => {
    if (draft.length >= MAX_SECTIONS) return;
    if (draft.some((d) => d.kind === "spotlight")) {
      setError("Блок «Другие каналы» может быть только один.");
      return;
    }
    setError("");
    setDraft((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        kind: "spotlight",
        playlistId: null,
        title: "Другие каналы",
      },
    ]);
  };

  const save = async () => {
    if (draft.length === 0) {
      setError("Добавьте хотя бы один раздел.");
      return;
    }
    if (draft.length > MAX_SECTIONS) {
      setError(`Не больше ${MAX_SECTIONS} разделов.`);
      return;
    }
    if (draft.filter((d) => d.kind === "uploads").length > 1) {
      setError("Раздел «Все видео» может быть только один.");
      return;
    }
    if (draft.filter((d) => d.kind === "spotlight").length > 1) {
      setError("Блок «Другие каналы» может быть только один.");
      return;
    }
    for (const row of draft) {
      if (row.kind === "playlist" && !row.playlistId) {
        setError("Укажите плейлист для каждого раздела с типом «Плейлист».");
        return;
      }
    }

    setBusy(true);
    setError("");
    try {
      const { error: delErr } = await supabase.from("channel_home_sections").delete().eq("user_id", channelUserId);
      if (delErr) throw delErr;

      for (let i = 0; i < draft.length; i++) {
        const row = draft[i];
        const { error: insErr } = await supabase.from("channel_home_sections").insert({
          user_id: channelUserId,
          position: i,
          section_kind: row.kind,
          playlist_id: row.kind === "playlist" ? row.playlistId : null,
          display_title: row.title.trim() || null,
        });
        if (insErr) throw insErr;
      }
      router.refresh();
      onSaved?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Не удалось сохранить.");
    } finally {
      setBusy(false);
    }
  };

  const listMaxH = "max-h-[min(60vh,520px)]";

  const fieldLabel = "mb-1 block text-sm font-bold tracking-tight text-slate-100";
  const fieldBase =
    "w-full rounded-lg border border-white/15 bg-[#080d18] px-3 py-2.5 text-sm font-medium text-slate-100 shadow-inner outline-none ring-cyan-400/30 focus:border-cyan-400/40 focus:ring-1";

  const draftRows = draft.map((row, index) => (
    <li
      key={row.key}
      className="rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.06] to-transparent p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3.5"
    >
      <div className="flex gap-2 sm:gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1 border-r border-white/10 pr-2 sm:pr-3">
          <span className="text-xs font-black tabular-nums text-cyan-300/90">{index + 1}</span>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100 disabled:opacity-25"
            aria-label="Выше"
            onClick={() => move(index, -1)}
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100 disabled:opacity-25"
            aria-label="Ниже"
            onClick={() => move(index, 1)}
            disabled={index === draft.length - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className={fieldLabel}>Тип раздела</label>
            <select
              value={row.kind}
              onChange={(e) => {
                const kind = e.target.value as DraftItem["kind"];
                setDraft((prev) => {
                  const otherHasUploads = prev.some((x, j) => j !== index && x.kind === "uploads");
                  const otherHasSpotlight = prev.some((x, j) => j !== index && x.kind === "spotlight");
                  if (kind === "uploads" && otherHasUploads) {
                    setError("Раздел «Все видео» может быть только один.");
                    return prev;
                  }
                  if (kind === "spotlight" && otherHasSpotlight) {
                    setError("Блок «Другие каналы» может быть только один.");
                    return prev;
                  }
                  setError("");
                  return prev.map((r, i) => {
                    if (i !== index) return r;
                    if (kind === "uploads") {
                      return { ...r, kind, playlistId: null, title: r.title || "Видео" };
                    }
                    if (kind === "spotlight") {
                      return { ...r, kind: "spotlight", playlistId: null, title: r.title || "Другие каналы" };
                    }
                    const first =
                      channelPlaylists.find((p) => p.id === r.playlistId) ??
                      channelPlaylists.find((p) => !prev.some((x, j) => j !== index && x.playlistId === p.id)) ??
                      channelPlaylists[0];
                    return {
                      ...r,
                      kind: "playlist",
                      playlistId: first?.id ?? null,
                      title: r.title || first?.title || "Плейлист",
                    };
                  });
                });
              }}
              className={fieldBase}
            >
              <option value="uploads">Все видео канала</option>
              <option value="playlist">Плейлист</option>
              <option value="spotlight">Другие каналы</option>
            </select>
          </div>
          {row.kind === "playlist" ? (
            <div>
              <label className={fieldLabel}>Какой плейлист</label>
              <select
                value={row.playlistId ?? ""}
                onChange={(e) => {
                  const pid = e.target.value || null;
                  const pl = channelPlaylists.find((p) => p.id === pid);
                  setDraft((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, playlistId: pid, title: pl?.title ?? r.title } : r)),
                  );
                }}
                className={fieldBase}
              >
                <option value="">Выберите плейлист…</option>
                {channelPlaylists.map((p) => (
                  <option key={p.id} value={p.id} disabled={usedPlaylistIds.has(p.id) && p.id !== row.playlistId}>
                    {p.title}
                    {p.visibility !== "public" ? ` (${p.visibility})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                На канале у ряда будет кнопка «Воспроизвести всё».
              </p>
            </div>
          ) : null}
          <div>
            <label className={fieldLabel}>Заголовок на главной</label>
            <input
              value={row.title}
              onChange={(e) =>
                setDraft((prev) => prev.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))
              }
              placeholder={
                row.kind === "uploads"
                  ? "Например: Видео"
                  : row.kind === "spotlight"
                    ? "Например: Мои друзья · Другие каналы"
                    : "Название ряда"
              }
              className={clsx(fieldBase, "placeholder:font-normal placeholder:text-slate-500")}
            />
          </div>
          {row.kind === "spotlight" ? <ChannelSpotlightLinksForm ownerUserId={channelUserId} /> : null}
        </div>
        {row.kind === "uploads" ? (
          <div
            className="h-9 max-w-[7rem] shrink-0 self-start rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center text-[10px] font-medium leading-tight text-slate-500"
            title="Обязательный раздел"
          >
            Нельзя удалить
          </div>
        ) : (
          <button
            type="button"
            onClick={() => remove(index)}
            className="h-9 shrink-0 self-start rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
            aria-label="Удалить раздел"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  ));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#10182a] p-4 sm:p-5">
      <div className="mb-4 border-b border-white/10 pb-4">
        <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">Разделы главной</h3>
        <p className="mt-2 text-sm font-medium text-slate-400">
          До {MAX_SECTIONS} рядов на главной. Ряд «Все видео» один и{" "}
          <span className="text-slate-200">обязателен</span> — его нельзя убрать (это не вкладка «Видео» в меню: она
          всегда есть у канала отдельно).
        </p>
      </div>

      <ul className={clsx("mt-3 space-y-2.5 overflow-y-auto pr-1", listMaxH)}>{draftRows}</ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        {uploadsCount === 0 ? (
          <button
            type="button"
            onClick={addUploads}
            disabled={draft.length >= MAX_SECTIONS}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition",
              draft.length >= MAX_SECTIONS
                ? "cursor-not-allowed border-white/5 opacity-50"
                : "border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25",
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Все видео
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setError("");
            if (draft.length >= MAX_SECTIONS) return;
            if (channelPlaylists.length === 0) {
              router.push("/studio?tab=playlists");
              return;
            }
            const available = channelPlaylists.find((p) => !usedPlaylistIds.has(p.id));
            if (!available) {
              router.push("/studio?tab=playlists");
              return;
            }
            setDraft((prev) => [
              ...prev,
              {
                key: `new-${Date.now()}`,
                kind: "playlist",
                playlistId: available.id,
                title: available.title,
              },
            ]);
          }}
          disabled={draft.length >= MAX_SECTIONS}
          title={
            draft.length >= MAX_SECTIONS
              ? "Достигнут лимит разделов"
              : "Добавить ряд с плейлистом или открыть вкладку «Плейлисты» в студии"
          }
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition",
            draft.length >= MAX_SECTIONS
              ? "cursor-not-allowed border-white/5 opacity-50"
              : "border-white/15 bg-white/[0.07] text-slate-100 hover:bg-white/12",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {channelPlaylists.length === 0
            ? "Создать плейлист"
            : usedPlaylistIds.size >= channelPlaylists.length
              ? "Открыть плейлисты"
              : "Ряд из плейлиста"}
        </button>
        <button
          type="button"
          onClick={addSpotlight}
          disabled={draft.length >= MAX_SECTIONS || spotlightCount >= 1}
          title={spotlightCount >= 1 ? "Блок «Другие каналы» уже добавлен" : undefined}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition",
            draft.length >= MAX_SECTIONS || spotlightCount >= 1
              ? "cursor-not-allowed border-white/5 opacity-50"
              : "border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Другие каналы
        </button>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-rose-300">{error}</p> : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2 sm:mt-5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/25 px-5 py-2.5 text-sm font-bold text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:bg-cyan-500/35 disabled:opacity-60"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

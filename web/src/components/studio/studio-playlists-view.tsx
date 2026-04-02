"use client";

import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import clsx from "clsx";

type Visibility = "public" | "unlisted" | "private";

export type StudioPlaylistRow = {
  id: string;
  title: string;
  description?: string | null;
  kind?: "channel" | "user";
  visibility?: Visibility;
  videos_count?: number;
  created_at: string;
};

export type StudioVideoPickRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
};

export type PlaylistVideoDetail = {
  video_id: string;
  position: number;
  title: string;
  thumbnail_url: string | null;
};

type PlaylistFieldErrors = {
  title?: string;
  description?: string;
  videos?: string;
};

function stopPlayerHotkeys(
  event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  event.stopPropagation();
}

export type StudioPlaylistsViewProps = {
  playlistKind: "channel" | "user";
  setPlaylistKind: (v: "channel" | "user") => void;
  playlistTitle: string;
  setPlaylistTitle: (v: string) => void;
  playlistDescription: string;
  setPlaylistDescription: (v: string) => void;
  playlistVisibility: Visibility;
  setPlaylistVisibility: (v: Visibility) => void;
  playlistFieldErrors: PlaylistFieldErrors;
  selectedPlaylistVideoIds: string[];
  setSelectedPlaylistVideoIds: React.Dispatch<React.SetStateAction<string[]>>;
  ownVideos: StudioVideoPickRow[];
  allVideos: StudioVideoPickRow[];
  onCreatePlaylist: () => void;
  isCreatingPlaylist: boolean;
  playlists: StudioPlaylistRow[];
  targetPlaylistIdForAdd: string;
  setTargetPlaylistIdForAdd: (id: string) => void;
  onAddVideosToPlaylist: () => void;
  isAddingVideosToPlaylist: boolean;
  expandedPlaylistId: string | null;
  playlistVideosDetail: Record<string, PlaylistVideoDetail[] | undefined>;
  loadingPlaylistDetailId: string | null;
  onToggleExpandPlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveVideoFromPlaylist: (playlistId: string, videoId: string) => void;
  deletingPlaylistId: string | null;
  playlistActionMessage: string | null;
};

export function StudioPlaylistsView({
  playlistKind,
  setPlaylistKind,
  playlistTitle,
  setPlaylistTitle,
  playlistDescription,
  setPlaylistDescription,
  playlistVisibility,
  setPlaylistVisibility,
  playlistFieldErrors,
  selectedPlaylistVideoIds,
  setSelectedPlaylistVideoIds,
  ownVideos,
  allVideos,
  onCreatePlaylist,
  isCreatingPlaylist,
  playlists,
  targetPlaylistIdForAdd,
  setTargetPlaylistIdForAdd,
  onAddVideosToPlaylist,
  isAddingVideosToPlaylist,
  expandedPlaylistId,
  playlistVideosDetail,
  loadingPlaylistDetailId,
  onToggleExpandPlaylist,
  onDeletePlaylist,
  onRemoveVideoFromPlaylist,
  deletingPlaylistId,
  playlistActionMessage,
}: StudioPlaylistsViewProps) {
  const videoSource = playlistKind === "channel" ? ownVideos : allVideos;

  return (
    <section className="mx-auto w-full max-w-[1600px] rounded-2xl border border-white/10 bg-[#10182a] p-3 sm:p-4 md:p-5 lg:p-6">
      <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl md:text-3xl">Плейлисты</h1>
      <p className="mt-2 text-sm text-slate-400 sm:text-base">
        Плейлист канала — только ваши ролики. Пользовательский — любые публичные видео сайта. Создайте плейлист пустым и
        добавляйте серии позже через «Добавить в плейлист».
      </p>

      {playlistActionMessage ? (
        <p className="mt-3 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
          {playlistActionMessage}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0c1323]/80 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-100">Новый плейлист</h2>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Тип плейлиста</span>
            <select
              value={playlistKind}
              onChange={(e) => {
                const next = e.target.value as "channel" | "user";
                setPlaylistKind(next);
                setSelectedPlaylistVideoIds([]);
                if (next === "channel") setPlaylistVisibility("public");
              }}
              onKeyDownCapture={stopPlayerHotkeys}
              className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
            >
              <option value="channel">Плейлист канала</option>
              <option value="user">Пользовательский плейлист</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Название</span>
            <input
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              onKeyDownCapture={stopPlayerHotkeys}
              className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
              placeholder="Например: Прохождение — все серии"
            />
            {playlistFieldErrors.title ? <span className="text-xs text-rose-300">{playlistFieldErrors.title}</span> : null}
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Описание</span>
            <textarea
              value={playlistDescription}
              onChange={(e) => setPlaylistDescription(e.target.value)}
              onKeyDownCapture={stopPlayerHotkeys}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
              placeholder="Кратко о плейлисте"
            />
            {playlistFieldErrors.description ? (
              <span className="text-xs text-rose-300">{playlistFieldErrors.description}</span>
            ) : null}
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Видимость</span>
            <select
              value={playlistVisibility}
              onChange={(e) => setPlaylistVisibility(e.target.value as Visibility)}
              onKeyDownCapture={stopPlayerHotkeys}
              className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
            >
              <option value="public">Публичный</option>
              <option value="unlisted">По ссылке</option>
              <option value="private">Только мне</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onCreatePlaylist}
            disabled={isCreatingPlaylist}
            className="w-full rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60 sm:text-base"
          >
            {isCreatingPlaylist ? "Создаём..." : "Создать плейлист"}
          </button>
          {playlistFieldErrors.videos ? <p className="text-xs text-rose-300">{playlistFieldErrors.videos}</p> : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0c1323]/80 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-100">
            {playlistKind === "channel" ? "Ваши видео" : "Видео сайта"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Отметьте ролики и добавьте их в уже созданный плейлист — внизу блока выберите плейлист и нажмите кнопку.
          </p>

          <div className="mt-4 max-h-[min(520px,55vh)] space-y-2 overflow-y-auto pr-1">
            {videoSource.length > 0 ? (
              videoSource.map((video) => {
                const checked = selectedPlaylistVideoIds.includes(video.id);
                return (
                  <label
                    key={video.id}
                    className={clsx(
                      "flex cursor-pointer gap-3 rounded-xl border p-2.5 transition sm:p-3",
                      checked
                        ? "border-cyan-300/35 bg-cyan-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedPlaylistVideoIds((prev) =>
                          e.target.checked ? [...prev, video.id] : prev.filter((id) => id !== video.id),
                        );
                      }}
                      className="mt-2 h-4 w-4 shrink-0"
                    />
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-black/50 sm:h-[72px] sm:w-[128px]">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-slate-500">Нет превью</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-slate-100 sm:text-base">{video.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(video.created_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-slate-400">Пока нет видео для выбора.</p>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Добавить отмеченные в плейлист</span>
              <select
                value={targetPlaylistIdForAdd}
                onChange={(e) => setTargetPlaylistIdForAdd(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
              >
                <option value="">— Выберите плейлист —</option>
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.kind === "channel" ? "канал" : "польз."}) · {p.videos_count ?? 0} вид.
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onAddVideosToPlaylist}
              disabled={isAddingVideosToPlaylist || !targetPlaylistIdForAdd || selectedPlaylistVideoIds.length === 0}
              className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.1] disabled:opacity-50 sm:text-base"
            >
              {isAddingVideosToPlaylist ? "Добавляем..." : "Добавить в плейлист"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">Ваши плейлисты</h2>
        <div className="mt-4 space-y-3">
          {playlists.length > 0 ? (
            playlists.map((playlist) => {
              const expanded = expandedPlaylistId === playlist.id;
              const detail = playlistVideosDetail[playlist.id];
              const loading = loadingPlaylistDetailId === playlist.id;
              return (
                <div key={playlist.id} className="rounded-xl border border-white/10 bg-[#0c1323]/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-slate-100 sm:text-lg">{playlist.title}</p>
                      {playlist.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{playlist.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                        {new Date(playlist.created_at).toLocaleString("ru-RU")} · {playlist.videos_count ?? 0} видео ·{" "}
                        {playlist.kind === "channel" ? "Канала" : "Пользовательский"} ·{" "}
                        {playlist.visibility === "private"
                          ? "Только мне"
                          : playlist.visibility === "unlisted"
                            ? "По ссылке"
                            : "Публичный"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleExpandPlaylist(playlist.id)}
                        className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 hover:bg-white/[0.1]"
                      >
                        {expanded ? "Свернуть" : "Состав"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePlaylist(playlist.id)}
                        disabled={deletingPlaylistId === playlist.id}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        {deletingPlaylistId === playlist.id ? "..." : "Удалить"}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {loading ? (
                        <p className="text-sm text-slate-400">Загрузка...</p>
                      ) : detail && detail.length > 0 ? (
                        <ul className="space-y-2">
                          {detail.map((row) => (
                            <li
                              key={row.video_id}
                              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#0b1120]/60 p-2"
                            >
                              <span className="w-8 shrink-0 text-center text-xs text-slate-500">{row.position}</span>
                              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black/40 sm:h-14 sm:w-24">
                                {row.thumbnail_url ? (
                                  <img src={row.thumbnail_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] text-slate-600">—</div>
                                )}
                              </div>
                              <span className="min-w-0 flex-1 text-sm text-slate-200">{row.title}</span>
                              <button
                                type="button"
                                onClick={() => onRemoveVideoFromPlaylist(playlist.id, row.video_id)}
                                className="shrink-0 rounded border border-white/15 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                              >
                                Убрать
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">В плейлисте пока нет видео — добавьте их справа.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-400">Пока нет плейлистов — создайте первый в блоке слева.</p>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Camera, ImageIcon, Pencil, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ChannelBrandingControlsProps = {
  userId: string;
  channelName: string;
  initialAvatarUrl: string | null;
  initialBannerUrl: string | null;
  /**
   * dual — две иконки (шапка + аватар), как в студии;
   * single — одна кнопка «оформление» на шапке (страница канала).
   */
  entry?: "dual" | "single";
  /** dual: кнопка шапки */
  bannerButtonClassName?: string;
  /** dual: кнопка аватара */
  avatarButtonClassName?: string;
  /** single: одна кнопка на баннере */
  singleButtonClassName?: string;
};

type ValidationResult = {
  ok: boolean;
  message: string | null;
};

const AVATAR_MAX_MB = 5;
const BANNER_MAX_MB = 6;

function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

async function validateAvatar(file: File, previewUrl: string): Promise<ValidationResult> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, message: "Аватар: используйте JPG, PNG или WEBP." };
  }
  if (bytesToMb(file.size) > AVATAR_MAX_MB) {
    return { ok: false, message: `Аватар: файл больше ${AVATAR_MAX_MB} МБ.` };
  }
  const { width, height } = await loadImageDimensions(previewUrl);
  if (width < 98 || height < 98) {
    return { ok: false, message: "Аватар: минимальный размер 98x98." };
  }
  const ratio = width / height;
  if (ratio < 0.8 || ratio > 1.2) {
    return { ok: false, message: "Аватар: изображение должно быть почти квадратным." };
  }
  return { ok: true, message: null };
}

async function validateBanner(file: File, previewUrl: string): Promise<ValidationResult> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, message: "Шапка: используйте JPG, PNG или WEBP." };
  }
  if (bytesToMb(file.size) > BANNER_MAX_MB) {
    return { ok: false, message: `Шапка: файл больше ${BANNER_MAX_MB} МБ.` };
  }
  const { width, height } = await loadImageDimensions(previewUrl);
  if (width < 1230 || height < 338) {
    return { ok: false, message: "Шапка: минимум 1230x338 (как у YouTube safe area)." };
  }
  const ratio = width / height;
  if (ratio < 1.4 || ratio > 2.2) {
    return { ok: false, message: "Шапка: рекомендуемое соотношение близко к 16:9." };
  }
  return { ok: true, message: null };
}

async function uploadMedia(file: File, userId: string, kind: "avatar" | "banner") {
  const supabase = createSupabaseBrowserClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const safeExt = (extension ?? "jpg").toLowerCase();
  const path = `channels/${userId}/${kind}-${Date.now()}.${safeExt}`;
  const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadError) {
    throw new Error(uploadError.message || "Не удалось загрузить файл в Storage.");
  }
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export function ChannelBrandingControls({
  userId,
  channelName,
  initialAvatarUrl,
  initialBannerUrl,
  entry = "dual",
  bannerButtonClassName,
  avatarButtonClassName,
  singleButtonClassName,
}: ChannelBrandingControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialBannerUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl);
    setBannerUrl(initialBannerUrl);
    setAvatarPreview(initialAvatarUrl);
    setBannerPreview(initialBannerUrl);
    setAvatarFile(null);
    setBannerFile(null);
  }, [initialAvatarUrl, initialBannerUrl]);

  const avatarFallback = useMemo(() => {
    const source = channelName.trim();
    return source ? source.slice(0, 1).toUpperCase() : "К";
  }, [channelName]);

  const onPickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const validation = await validateAvatar(file, previewUrl);
    if (!validation.ok) {
      setError(validation.message ?? "Некорректный аватар.");
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  };

  const onPickBanner = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const validation = await validateBanner(file, previewUrl);
    if (!validation.ok) {
      setError(validation.message ?? "Некорректная шапка.");
      return;
    }
    setError("");
    setBannerFile(file);
    setBannerPreview(previewUrl);
  };

  const onSave = async () => {
    try {
      setIsSaving(true);
      setError("");
      const supabase = createSupabaseBrowserClient();
      let nextAvatar = avatarUrl;
      let nextBanner = bannerUrl;

      if (avatarFile) {
        nextAvatar = await uploadMedia(avatarFile, userId, "avatar");
      }
      if (bannerFile) {
        nextBanner = await uploadMedia(bannerFile, userId, "banner");
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: nextAvatar, banner_url: nextBanner })
        .eq("id", userId);
      if (updateError) {
        setError("Не удалось сохранить изменения канала.");
        return;
      }

      setAvatarUrl(nextAvatar);
      setBannerUrl(nextBanner);
      setAvatarFile(null);
      setBannerFile(null);
      setIsOpen(false);
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Ошибка загрузки.");
    } finally {
      setIsSaving(false);
    }
  };

  const onRemoveBanner = () => {
    setError("");
    setBannerFile(null);
    setBannerPreview(null);
    setBannerUrl(null);
  };

  const open = () => {
    setError("");
    setIsOpen(true);
  };

  return (
    <>
      {entry === "single" ? (
        <button
          type="button"
          onClick={open}
          className={clsx(
            "inline-flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30 sm:text-sm",
            singleButtonClassName ?? "absolute right-3 top-3 z-20",
          )}
          aria-label="Сменить аватар или шапку"
        >
          <Camera className="h-4 w-4 shrink-0" />
          Аватар и шапка
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={open}
            className={clsx(
              "rounded-lg border border-cyan-300/35 bg-cyan-500/20 p-2 text-cyan-100 transition hover:bg-cyan-500/30",
              bannerButtonClassName ?? "absolute right-3 top-3 z-20",
            )}
            aria-label="Сменить шапку канала"
            title="Сменить шапку"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={open}
            className={clsx(
              "rounded-lg border border-cyan-300/35 bg-cyan-500/20 p-1.5 text-cyan-100 transition hover:bg-cyan-500/30",
              avatarButtonClassName ?? "absolute right-1 bottom-1 top-auto z-20",
            )}
            aria-label="Сменить аватар канала"
            title="Сменить аватар"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111a2c] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-100">Внешний вид канала</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-200 transition hover:bg-white/10"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-white/10 bg-[#0f1628] sm:h-56">
              <div
                className="h-full w-full bg-cover bg-center"
                style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined}
              />
              {!bannerPreview ? (
                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_20%,rgba(34,211,238,0.35),rgba(15,23,42,0.05)_42%),linear-gradient(135deg,#111c33_0%,#0d1428_55%,#0a1222_100%)]" />
              ) : null}
              <div
                className="absolute bottom-4 left-4 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-[#1a2a44] text-2xl font-semibold text-white shadow-lg"
                style={
                  avatarPreview
                    ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              >
                {avatarPreview ? null : avatarFallback}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-white/12 bg-white/[0.04] p-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <ImageIcon className="h-4 w-4 text-cyan-200" />
                  Сменить шапку
                </span>
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100">
                  <Upload className="h-4 w-4" />
                  Выбрать файл
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickBanner}
                />
                <span className="text-[11px] leading-snug text-slate-500">
                  JPG/PNG/WEBP, до 6 МБ, мин. 1230×338, соотношение около 16∶9.
                </span>
              </label>

              <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-white/12 bg-white/[0.04] p-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Camera className="h-4 w-4 text-cyan-200" />
                  Сменить аватар
                </span>
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100">
                  <Upload className="h-4 w-4" />
                  Выбрать файл
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickAvatar}
                />
                <span className="text-[11px] leading-snug text-slate-500">
                  JPG/PNG/WEBP, до 5 МБ, мин. 98×98, почти квадрат.
                </span>
              </label>
            </div>

            {bannerPreview || bannerUrl ? (
              <button
                type="button"
                onClick={onRemoveBanner}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20 sm:w-auto"
              >
                <X className="h-4 w-4" />
                Убрать шапку (показать градиент)
              </button>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-white/12 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={isSaving}
                className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

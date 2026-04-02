"use client";

import { ChangeEvent, useMemo, useState } from "react";
import clsx from "clsx";
import { Camera, Pencil, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BrandingEditorProps = {
  userId: string;
  channelName: string;
  initialAvatarUrl: string | null;
  initialBannerUrl: string | null;
  target: "avatar" | "banner";
  icon?: "pencil" | "camera";
  buttonClassName?: string;
  iconClassName?: string;
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
  });
  if (uploadError) {
    throw new Error("Не удалось загрузить файл в Storage.");
  }
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export function BrandingEditor({
  userId,
  channelName,
  initialAvatarUrl,
  initialBannerUrl,
  target,
  icon = "pencil",
  buttonClassName,
  iconClassName,
}: BrandingEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialBannerUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

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

      if (target === "avatar" && avatarFile) {
        nextAvatar = await uploadMedia(avatarFile, userId, "avatar");
      }
      if (target === "banner" && bannerFile) {
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
    } catch {
      setError("Ошибка загрузки. Проверьте bucket media и права доступа.");
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(
          "absolute right-3 top-3 z-20 rounded-lg border border-cyan-300/35 bg-cyan-500/20 p-2 text-cyan-100 transition hover:bg-cyan-500/30",
          buttonClassName,
        )}
        aria-label={target === "banner" ? "Редактировать шапку канала" : "Редактировать аватар канала"}
      >
        {icon === "camera" ? (
          <Camera className={clsx("h-4 w-4", iconClassName)} />
        ) : (
          <Pencil className={clsx("h-4 w-4", iconClassName)} />
        )}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111a2c] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Оформление канала</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-200 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-white/10 bg-[#0f1628] sm:h-56">
              <div
                className={clsx("h-full w-full bg-cover bg-center")}
                style={
                  bannerPreview
                    ? {
                        backgroundImage: `url(${bannerPreview})`,
                      }
                    : undefined
                }
              />
              {!bannerPreview ? (
                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_20%,rgba(34,211,238,0.35),rgba(15,23,42,0.05)_42%),linear-gradient(135deg,#111c33_0%,#0d1428_55%,#0a1222_100%)]" />
              ) : null}
              <div
                className="absolute bottom-4 left-4 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-[radial-gradient(circle_at_30%_30%,#82deff_12%,#2d9eff_48%,#0f56be_74%,#0a1d66_100%)] text-2xl font-semibold text-white shadow-[0_8px_20px_rgba(15,30,80,0.45)]"
                style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                {avatarPreview ? null : avatarFallback}
              </div>
            </div>

            {target === "avatar" ? (
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/25">
                <Upload className="h-4 w-4" />
                Выбрать аватар
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </label>
            ) : (
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/25">
                <Upload className="h-4 w-4" />
                Выбрать шапку
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickBanner}
                />
              </label>
            )}

            {target === "banner" && (bannerPreview || bannerUrl) ? (
              <button
                type="button"
                onClick={onRemoveBanner}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
              >
                <X className="h-4 w-4" />
                Удалить шапку
              </button>
            ) : null}

            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
              {target === "avatar" ? (
                <>Аватар: JPG/PNG/WEBP, до 5 МБ, минимум 98x98, желательно квадрат.</>
              ) : (
                <>Шапка: JPG/PNG/WEBP, до 6 МБ, минимум 1230x338, лучше около 2048x1152.</>
              )}
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onSave}
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

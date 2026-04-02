"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/layout/app-header";

type ChannelProfile = {
  id: string;
  channel_name: string;
  channel_handle: string;
  avatar_url: string | null;
  banner_url: string | null;
};

function isMissingColumnError(message: string | undefined, columnName: string): boolean {
  if (!message) return false;
  const text = message.toLowerCase();
  return text.includes(columnName.toLowerCase()) && text.includes("column");
}

async function uploadChannelMedia(
  file: File,
  userId: string,
  kind: "avatar" | "banner",
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const safeExt = (extension ?? "jpg").toLowerCase();
  const filePath = `channels/${userId}/${kind}-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadError) {
    throw new Error(uploadError.message || "Не удалось загрузить файл в Storage.");
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filePath);
  return data.publicUrl;
}

export default function EditChannelPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<ChannelProfile | null>(null);

  const [channelName, setChannelName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [hasBannerColumn, setHasBannerColumn] = useState(true);

  useEffect(() => {
    const revokedAvatar: string | null = null;
    const revokedBanner: string | null = null;

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/auth");
        return;
      }

      let bannerColumnAvailable = true;
      let { data, error: profileError } = await supabase
        .from("users")
        .select("id, channel_name, channel_handle, avatar_url, banner_url")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError && isMissingColumnError(profileError.message, "banner_url")) {
        bannerColumnAvailable = false;
        setHasBannerColumn(false);
        const fallbackResult = await supabase
          .from("users")
          .select("id, channel_name, channel_handle, avatar_url")
          .eq("id", userData.user.id)
          .maybeSingle();
        data = fallbackResult.data
          ? { ...fallbackResult.data, banner_url: null }
          : null;
        profileError = fallbackResult.error;
      } else {
        bannerColumnAvailable = true;
        setHasBannerColumn(true);
      }

      if (!data && !profileError) {
        const fallbackName =
          (userData.user.user_metadata?.channel_name as string | undefined) ||
          (userData.user.user_metadata?.username as string | undefined) ||
          userData.user.email?.split("@")[0] ||
          "Канал";

        const payload = bannerColumnAvailable
          ? {
              id: userData.user.id,
              channel_name: fallbackName,
              avatar_url: null,
              banner_url: null,
            }
          : {
              id: userData.user.id,
              channel_name: fallbackName,
              avatar_url: null,
            };

        const createdResult = await supabase
          .from("users")
          .upsert(payload, { onConflict: "id" })
          .select("id, channel_name, channel_handle, avatar_url")
          .maybeSingle();

        data = createdResult.data
          ? { ...createdResult.data, banner_url: null }
          : null;
        profileError = createdResult.error;
      }

      if (profileError || !data) {
        if (isMissingColumnError(profileError?.message, "banner_url")) {
          setError("Примените миграцию 05_channel_branding.sql, затем обновите страницу.");
        } else {
          setError("Не удалось загрузить данные канала.");
        }
        setIsLoading(false);
        return;
      }

      setProfile(data);
      setChannelName(data.channel_name);
      setAvatarPreview(data.avatar_url);
      setBannerPreview(data.banner_url);
      setIsLoading(false);
    };

    void loadProfile();

    return () => {
      if (revokedAvatar) URL.revokeObjectURL(revokedAvatar);
      if (revokedBanner) URL.revokeObjectURL(revokedBanner);
    };
  }, [router]);

  const avatarFallback = useMemo(() => {
    const source = channelName.trim();
    return source ? source[0].toUpperCase() : "К";
  }, [channelName]);

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBannerSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    if (channelName.trim().length < 3) {
      setError("Название канала должно быть не короче 3 символов.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccess("");

      let nextAvatarUrl = profile.avatar_url;
      let nextBannerUrl = profile.banner_url;

      if (avatarFile) {
        nextAvatarUrl = await uploadChannelMedia(avatarFile, profile.id, "avatar");
      }
      if (bannerFile && hasBannerColumn) {
        nextBannerUrl = await uploadChannelMedia(bannerFile, profile.id, "banner");
      }

      const supabase = createSupabaseBrowserClient();
      const updatePayload = hasBannerColumn
        ? {
            channel_name: channelName.trim(),
            avatar_url: nextAvatarUrl,
            banner_url: nextBannerUrl,
          }
        : {
            channel_name: channelName.trim(),
            avatar_url: nextAvatarUrl,
          };
      const { error: updateError } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", profile.id);

      if (updateError) {
        setError("Не удалось сохранить изменения канала.");
        return;
      }

      setSuccess("Изменения сохранены.");
      setAvatarFile(null);
      setBannerFile(null);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              channel_name: channelName.trim(),
              avatar_url: nextAvatarUrl,
              banner_url: nextBannerUrl,
            }
          : prev,
      );
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Ошибка загрузки медиа.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#10182a] p-6 text-sm text-slate-300">
          Загружаем данные канала...
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-2xl font-semibold text-slate-100">Настройка канала</h1>

        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#10182a] p-4 sm:p-6"
        >
        <div
          className="h-40 overflow-hidden rounded-xl border border-white/10 bg-[#0b1323] sm:h-52"
          style={
            bannerPreview
              ? {
                  backgroundImage: `url(${bannerPreview})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {!bannerPreview ? (
            <div className="h-full w-full bg-[radial-gradient(120%_120%_at_15%_20%,rgba(34,211,238,0.35),rgba(15,23,42,0.05)_42%),linear-gradient(135deg,#111c33_0%,#0d1428_55%,#0a1222_100%)]" />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div
            className={clsx(
              "grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-[radial-gradient(circle_at_30%_30%,#82deff_12%,#2d9eff_48%,#0f56be_74%,#0a1d66_100%)] text-2xl font-semibold text-white",
              avatarPreview ? "bg-cover bg-center" : "",
            )}
            style={avatarPreview ? { backgroundImage: `url(${avatarPreview})` } : undefined}
          >
            {avatarPreview ? null : avatarFallback}
          </div>

          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/25">
              Загрузить аватар
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </label>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/25">
              Загрузить шапку
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerSelect}
                disabled={!hasBannerColumn}
              />
            </label>
            {!hasBannerColumn ? (
              <p className="text-xs text-amber-200">
                Для шапки канала примените миграцию `05_channel_branding.sql`.
              </p>
            ) : null}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Название канала</span>
          <input
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            minLength={3}
            maxLength={40}
            className="w-full rounded-xl border border-white/10 bg-[#0c1323] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
          />
        </label>

        <div className="text-xs text-slate-400">
          Публичная ссылка канала:{" "}
          <span className="text-cyan-200">@{profile?.channel_handle ?? "channel"}</span>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            {success}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {isSaving ? "Сохраняем..." : "Сохранить изменения"}
          </button>
          <Link
            href={profile?.channel_handle ? `/@${profile.channel_handle}` : "/"}
            className="rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Открыть канал
          </Link>
        </div>
        </form>
      </div>
    </div>
  );
}

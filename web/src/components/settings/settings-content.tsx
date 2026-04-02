"use client";

import Link from "next/link";
import clsx from "clsx";
import { ExternalLink, Trash2, Video, UserCog, Wrench } from "lucide-react";
import { clearSearchHistory } from "@/lib/search-history";
import { useAuthState } from "@/components/auth/auth-context";

export function SettingsContent() {
  const { isAuthenticated } = useAuthState();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-12 pt-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Настройки</h1>
        <p className="mt-1 text-sm text-slate-400">Профиль, поиск и ссылки на инструменты.</p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          <Wrench className="h-4 w-4" />
          Поиск
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Недавние запросы хранятся только в этом браузере (localStorage).
        </p>
        <button
          type="button"
          onClick={() => {
            clearSearchHistory();
            window.dispatchEvent(new Event("potok-search-history-cleared"));
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Очистить историю поиска
        </button>
      </section>

      {isAuthenticated ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <UserCog className="h-4 w-4" />
            Канал и контент
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/channel/edit"
              className={clsx(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20",
              )}
            >
              Оформление канала
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Link>
            <Link
              href="/studio"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.1]"
            >
              <Video className="h-4 w-4 text-cyan-200" />
              Студия
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-400">
            <Link href="/auth" className="text-cyan-300 underline-offset-2 hover:underline">
              Войдите
            </Link>
            , чтобы управлять каналом и загрузками.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">О сервисе</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          ПОТОК — видеоплатформа. Настройки аккаунта и уведомлений можно расширять по мере развития продукта.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";

export default function WatchNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-semibold tracking-tight text-cyan-400/90">404</p>
      <h1 className="mt-4 text-xl font-medium text-[var(--foreground)]">Видео не найдено</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        Ролик удалён, скрыт настройками приватности, автор заморожен или ссылка устарела.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          На главную
        </Link>
        <Link
          href="/studio"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:border-white/20 hover:bg-white/5"
        >
          В студию
        </Link>
      </div>
    </div>
  );
}

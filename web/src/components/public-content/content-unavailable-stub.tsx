import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";

type Kind = "channel" | "video";

const COPY: Record<
  Kind,
  { title: string; body: string }
> = {
  channel: {
    title: "Канал недоступен",
    body: "Этот канал удалён или временно недоступен. Имя и материалы не отображаются.",
  },
  video: {
    title: "Видео недоступно",
    body: "Ролик принадлежит каналу, который удалён или недоступен. Просмотр для других пользователей закрыт.",
  },
};

/** Заглушка без имён канала/контента — для замороженных аккаунтов (не владелец). */
export function ContentUnavailableStub({ kind }: { kind: Kind }) {
  const { title, body } = COPY[kind];
  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
        <Link href="/" className="mt-8 inline-block text-cyan-300 hover:underline">
          На главную
        </Link>
      </main>
    </div>
  );
}

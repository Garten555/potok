import type { ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";

export function LegalDocShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">{children}</div>
        <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-6 text-sm text-slate-500">
          <Link href="/rules" className="text-cyan-300 hover:underline">
            Правила сервиса
          </Link>
          <Link href="/privacy" className="text-cyan-300 hover:underline">
            Конфиденциальность
          </Link>
          <Link href="/offer" className="text-cyan-300 hover:underline">
            Соглашение
          </Link>
          <Link href="/" className="text-cyan-300 hover:underline">
            На главную
          </Link>
        </nav>
      </main>
    </div>
  );
}

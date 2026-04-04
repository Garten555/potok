"use client";

import Link from "next/link";
import { useAccountFrozen } from "@/components/layout/account-frozen-context";

export default function ModerationSuspendedPage() {
  const { refresh } = useAccountFrozen();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-100">Канал заблокирован по модерации</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        По накопленным жалобам применена долгая блокировка. Обжалование этого срока недоступно. Подписчики
        сохраняются; после окончания срока канал снова станет доступен, если не будет новых нарушений.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Актуальные правила и санкции описаны на странице{" "}
        <Link href="/rules" className="text-cyan-300 hover:underline" onClick={() => refresh()}>
          правил сервиса
        </Link>
        .
      </p>
      <Link href="/" className="mt-8 inline-block text-cyan-300 hover:underline">
        На главную
      </Link>
    </div>
  );
}

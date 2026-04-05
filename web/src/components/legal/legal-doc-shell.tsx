import type { ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { getLegalOperator, operatorConfigured, type LegalOperator } from "@/lib/legal-operator";

export function LegalDocShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const op = getLegalOperator();
  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
        <OperatorRequisitesBlock operator={op} />
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

function OperatorRequisitesBlock({ operator }: { operator: LegalOperator }) {
  if (!operatorConfigured(operator)) {
    return (
      <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95">
        Для отображения реквизитов оператора задайте в окружении сборки переменные{" "}
        <span className="font-mono text-[11px]">NEXT_PUBLIC_OPERATOR_NAME</span> и{" "}
        <span className="font-mono text-[11px]">NEXT_PUBLIC_OPERATOR_EMAIL</span> (при необходимости — INN, ОГРН, адрес).
      </p>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-relaxed text-slate-400">
      <p className="font-medium text-slate-300">Оператор / владелец сервиса</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
        <li>{operator.name}</li>
        {operator.inn ? <li>ИНН: {operator.inn}</li> : null}
        {operator.ogrn ? <li>ОГРН / ОГРНИП: {operator.ogrn}</li> : null}
        {operator.address ? <li>Адрес: {operator.address}</li> : null}
        <li>
          E-mail:{" "}
          <a href={`mailto:${operator.email}`} className="text-cyan-300 hover:underline">
            {operator.email}
          </a>
        </li>
      </ul>
    </div>
  );
}

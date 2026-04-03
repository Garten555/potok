"use client";

import clsx from "clsx";
import {
  ExternalLink,
  Flag,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  Unlock,
  UserSearch,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminStaff } from "@/components/admin/admin-staff-context";
import { isAdminRole } from "@/lib/user-role";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { viewerRole } = useAdminStaff();
  const admin = isAdminRole(viewerRole);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems: { href: string; label: string; Icon: typeof LayoutDashboard }[] = [
    { href: "/admin/overview", label: "Обзор", Icon: LayoutDashboard },
    { href: "/admin/reports", label: "Жалобы", Icon: Flag },
    ...(admin ? [{ href: "/admin/unfreeze", label: "Разморозка", Icon: Unlock }] : []),
    { href: "/admin/users", label: "Пользователи", Icon: UserSearch },
  ];

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#070a10] text-slate-100 lg:flex-row">
      {/* Mobile top */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-500/15 bg-[#0c101c]/95 px-3 py-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200"
          aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-300/90" aria-hidden />
          <span className="text-sm font-semibold tracking-wide text-amber-100/95">Персонал</span>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-cyan-200/90"
        >
          На сайт
        </Link>
      </header>

      {/* Mobile drawer */}
      <div
        className={clsx(
          "fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={clsx(
          "fixed left-0 top-0 z-40 flex h-full w-[min(18rem,92vw)] flex-col border-r border-amber-500/20 bg-gradient-to-b from-[#141008] via-[#0e0c12] to-[#08060a] shadow-[8px_0_40px_rgba(0,0,0,0.45)] transition-transform duration-300 lg:static lg:z-0 lg:w-56 lg:translate-x-0 lg:shadow-none xl:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-amber-500/15 px-4 py-5">
          <Link href="/" className="flex items-center gap-2 outline-none ring-amber-500/30 focus-visible:ring-2">
            <div className="h-9 w-24 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat opacity-95" aria-hidden />
          </Link>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-200/80">
            <Shield className="h-4 w-4" />
            Панель персонала
          </p>
          {viewerRole ? (
            <span
              className={clsx(
                "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                admin
                  ? "border border-amber-400/40 bg-amber-500/20 text-amber-100"
                  : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100",
              )}
            >
              {admin ? "Администратор" : "Модератор"}
            </span>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {navItems.map(({ href, label, Icon }) => {
            const active =
              pathname === href ||
              (href === "/admin/overview" && pathname === "/admin") ||
              (href !== "/admin/overview" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-amber-500/15 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                <Icon className={clsx("h-[18px] w-[18px] shrink-0", active ? "text-amber-200" : "text-slate-500")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-cyan-200"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            На главную сайта
          </Link>
          <Link
            href="/settings"
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Настройки аккаунта
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden border-b border-white/8 bg-[#0a0e18]/90 px-6 py-3 backdrop-blur lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200/70">ПОТОК · персонал</p>
            <p className="text-sm text-slate-500">Отдельная зона модерации и администрирования</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
            >
              На сайт
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

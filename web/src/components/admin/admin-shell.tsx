"use client";

import clsx from "clsx";
import {
  BadgeCheck,
  Flag,
  Home,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  Unlock,
  UserSearch,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminStaff } from "@/components/admin/admin-staff-context";
import { isAdminRole, isOwnerRole, staffRoleLabelRu } from "@/lib/user-role";
import {
  SIDEBAR_ICON_CLASS,
  SIDEBAR_ICON_RAIL_CLASS,
  SIDEBAR_NAV_COLLAPSED_SQ,
} from "@/components/layout/sidebar-icons";
import {
  usePotokSidebarExpanded,
  useSidebarShowLabels,
} from "@/components/layout/use-potok-sidebar-expanded";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { viewerRole } = useAdminStaff();
  const admin = isAdminRole(viewerRole);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { expanded, toggleExpanded } = usePotokSidebarExpanded();
  const showLabels = useSidebarShowLabels(expanded, mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems: { href: string; label: string; hint: string; Icon: typeof LayoutDashboard }[] = [
    { href: "/admin/overview", label: "Обзор", hint: "сводка платформы и метрики", Icon: LayoutDashboard },
    { href: "/admin/reports", label: "Жалобы", hint: "очередь жалоб пользователей", Icon: Flag },
    {
      href: "/admin/verification-requests",
      label: "Верификация",
      hint: "заявки на галочку канала",
      Icon: BadgeCheck,
    },
    ...(admin
      ? [{ href: "/admin/unfreeze", label: "Разморозка", hint: "заявки на снятие заморозки", Icon: Unlock }]
      : []),
    ...(admin
      ? [{ href: "/admin/team", label: "Модераторы", hint: "роли команды модерации", Icon: Users }]
      : []),
    { href: "/admin/users", label: "Пользователи", hint: "поиск и карточки аккаунтов", Icon: UserSearch },
  ];

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#070a10] text-slate-100 lg:flex-row">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-500/15 bg-[#0c101c]/95 px-3 py-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200"
          aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className={SIDEBAR_ICON_CLASS} /> : <Menu className={SIDEBAR_ICON_CLASS} />}
        </button>
        <div className="flex items-center gap-2">
          <Shield className={clsx(SIDEBAR_ICON_CLASS, "text-amber-300/90")} aria-hidden />
          <span className="text-sm font-semibold tracking-wide text-amber-100/95">Админ-панель</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-xs font-medium text-cyan-200/90"
        >
          <Home className={clsx(SIDEBAR_ICON_CLASS, "opacity-90")} />
          На главную
        </Link>
      </header>

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
          "fixed left-0 top-0 z-40 flex max-h-screen flex-col overflow-y-auto border-r border-amber-500/20 bg-gradient-to-b from-[#141008] via-[#0e0c12] to-[#08060a] shadow-[8px_0_40px_rgba(0,0,0,0.45)] transition-[transform,width] duration-300 ease-out",
          "max-lg:w-[min(18rem,92vw)] max-lg:px-0",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:pointer-events-none max-lg:-translate-x-full",
          /* self-start + h-screen: иначе flex растягивает колонку на высоту main и sticky не «липнет» к вьюпорту */
          "lg:pointer-events-auto lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:max-h-screen lg:shrink-0 lg:self-start lg:translate-x-0 lg:shadow-none",
          expanded ? "lg:w-60 xl:w-64" : "lg:w-[5.25rem]",
        )}
      >
        <div
          className={clsx(
            "border-b border-amber-500/15 px-3 py-4",
            showLabels ? "lg:px-2 lg:py-5" : "lg:px-1 lg:py-2",
          )}
        >
          <div
            className={clsx(
              "flex items-center gap-2",
              !showLabels && "lg:w-full lg:flex-col lg:items-stretch lg:gap-1.5",
            )}
          >
            <button
              type="button"
              className={clsx(
                "grid shrink-0 place-items-center text-slate-200 transition max-lg:hidden",
                expanded
                  ? "h-9 w-9 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10"
                  : "h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.09]",
              )}
              title={expanded ? "Свернуть меню админки" : "Развернуть меню админки"}
              aria-label={expanded ? "Свернуть меню" : "Развернуть меню"}
              onClick={toggleExpanded}
            >
              <Menu className={SIDEBAR_ICON_CLASS} />
            </button>
            <Link
              href="/"
              className={clsx(
                "flex min-w-0 flex-1 items-center gap-2 outline-none ring-amber-500/30 focus-visible:ring-2",
                !showLabels && "lg:hidden",
              )}
            >
              <div className="h-9 min-w-[6rem] flex-1 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat opacity-95" aria-hidden />
            </Link>
          </div>
          <p
            className={clsx(
              "mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-200/80",
              !showLabels && "lg:hidden",
            )}
          >
            <Shield className={SIDEBAR_ICON_CLASS} />
            <span>Панель управления</span>
          </p>
          {viewerRole ? (
            <span
              className={clsx(
                "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                !showLabels && "lg:hidden",
                isOwnerRole(viewerRole)
                  ? "border border-violet-400/40 bg-violet-500/20 text-violet-100"
                  : admin
                    ? "border border-amber-400/40 bg-amber-500/20 text-amber-100"
                    : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100",
              )}
            >
              {staffRoleLabelRu(viewerRole) ?? viewerRole}
            </span>
          ) : null}
        </div>

        <nav
          className={clsx(
            "flex flex-col gap-0.5 py-3",
            showLabels ? "px-2" : "px-2 lg:px-1",
          )}
        >
          {navItems.map(({ href, label, hint, Icon }) => {
            const active =
              pathname === href ||
              (href === "/admin/overview" && pathname === "/admin") ||
              (href !== "/admin/overview" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={`${label} — ${hint}`}
                className={clsx(
                  "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition",
                  showLabels ? "px-3" : "justify-center px-0 lg:justify-center",
                  active
                    ? "bg-amber-500/15 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                <Icon
                  className={clsx(
                    showLabels ? SIDEBAR_ICON_CLASS : SIDEBAR_ICON_RAIL_CLASS,
                    active ? "text-amber-200" : "text-slate-500",
                  )}
                />
                <span
                  className={clsx(
                    "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                    showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 shrink-0 border-t border-white/10 p-3">
          <Link
            href="/"
            title="На главную — выйти из админки на сайт"
            className={clsx(
              "flex min-w-0 items-center rounded-xl text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white",
              showLabels
                ? "w-full gap-3 px-3 py-2.5"
                : clsx("w-full justify-center gap-0 px-0 py-2.5", SIDEBAR_NAV_COLLAPSED_SQ),
            )}
          >
            <Home className={clsx(showLabels ? SIDEBAR_ICON_CLASS : SIDEBAR_ICON_RAIL_CLASS, "text-slate-300")} />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              На главную
            </span>
          </Link>
          <Link
            href="/settings"
            title="Настройки аккаунта — профиль и безопасность"
            className={clsx(
              "mt-1 flex min-w-0 items-center rounded-xl text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200",
              showLabels
                ? "w-full gap-3 px-3 py-2.5"
                : clsx("w-full justify-center gap-0 px-0 py-2.5", SIDEBAR_NAV_COLLAPSED_SQ),
            )}
          >
            <Settings className={showLabels ? SIDEBAR_ICON_CLASS : SIDEBAR_ICON_RAIL_CLASS} />
            <span
              className={clsx(
                "min-w-0 overflow-hidden text-left transition-[opacity,width] duration-300",
                showLabels ? "flex-1 whitespace-nowrap opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              Настройки аккаунта
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden border-b border-white/8 bg-[#0a0e18]/90 px-6 py-3 backdrop-blur lg:flex lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-200/85">Администрирование платформы</p>
            <p className="mt-0.5 text-sm text-slate-500">Модерация контента, учётные записи и заявки</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <Home className={clsx(SIDEBAR_ICON_CLASS, "opacity-90")} />
              На главную
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isStaffRole } from "@/lib/user-role";
import { AdminStaffProvider } from "@/components/admin/admin-staff-context";
import { AdminShell } from "@/components/admin/admin-shell";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "denied" | "ok">("loading");
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/me/role", { credentials: "same-origin" });
        if (cancelled) return;
        if (!r.ok) {
          setPhase("denied");
          return;
        }
        const j = (await r.json()) as { role?: string | null };
        const role = j.role ?? null;
        if (!isStaffRole(role)) {
          setPhase("denied");
          return;
        }
        setViewerRole(role);
        setPhase("ok");
      } catch {
        if (!cancelled) setPhase("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e18] px-4 text-slate-400">
        Загрузка панели…
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e18] px-4 text-center text-slate-300">
        <p className="text-lg">Доступ только для модераторов и администраторов.</p>
        <Link href="/" className="mt-6 text-cyan-300 hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <AdminStaffProvider viewerRole={viewerRole}>
      <AdminShell>{children}</AdminShell>
    </AdminStaffProvider>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SESSION_ROLE_CHANGED_EVENT } from "@/lib/session-role-events";
import { isStaffRole } from "@/lib/user-role";
import { AdminStaffProvider } from "@/components/admin/admin-staff-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "denied" | "ok">("loading");
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/me/role", { credentials: "same-origin", cache: "no-store" });
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

  useEffect(() => {
    if (phase !== "ok") return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const refetchRole = () => {
      void (async () => {
        const r = await fetch("/api/me/role", { credentials: "same-origin", cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { role?: string | null };
        const role = j.role ?? null;
        setViewerRole(role);
        if (!isStaffRole(role)) setPhase("denied");
      })();
    };
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`admin-gate-role-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${uid}` },
          (payload) => {
            const role = (payload.new as { role?: string | null })?.role ?? null;
            setViewerRole(role);
            if (!isStaffRole(role)) setPhase("denied");
          },
        )
        .subscribe();
    });
    const onVis = () => {
      if (document.visibilityState === "visible") refetchRole();
    };
    window.addEventListener("focus", refetchRole);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener("focus", refetchRole);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "ok") return;
    const onRole = (e: Event) => {
      const role = (e as CustomEvent<{ role?: string }>).detail?.role ?? null;
      if (typeof role !== "string") return;
      setViewerRole(role);
      if (!isStaffRole(role)) setPhase("denied");
    };
    window.addEventListener(SESSION_ROLE_CHANGED_EVENT, onRole);
    return () => window.removeEventListener(SESSION_ROLE_CHANGED_EVENT, onRole);
  }, [phase]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e18] px-4 text-slate-400">
        Проверка доступа…
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e18] px-4 text-center text-slate-300">
        <p className="max-w-md text-lg leading-snug">
          Доступ к разделу ограничен: требуется роль модератора, администратора или владельца платформы.
        </p>
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

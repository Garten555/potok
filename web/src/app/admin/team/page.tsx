"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminTeamSection } from "@/components/admin/admin-team-section";
import { useAdminStaff } from "@/components/admin/admin-staff-context";
import { isAdminRole } from "@/lib/user-role";

export default function AdminTeamPage() {
  const { viewerRole } = useAdminStaff();
  const router = useRouter();

  useEffect(() => {
    if (viewerRole && !isAdminRole(viewerRole)) {
      router.replace("/admin/overview");
    }
  }, [viewerRole, router]);

  if (!viewerRole) {
    return <p className="text-slate-500">…</p>;
  }

  if (!isAdminRole(viewerRole)) {
    return null;
  }

  return <AdminTeamSection />;
}

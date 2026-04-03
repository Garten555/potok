"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminUnfreezeSection } from "@/components/admin/admin-unfreeze-section";
import { useAdminStaff } from "@/components/admin/admin-staff-context";
import { isAdminRole } from "@/lib/user-role";

export default function AdminUnfreezePage() {
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

  return <AdminUnfreezeSection />;
}

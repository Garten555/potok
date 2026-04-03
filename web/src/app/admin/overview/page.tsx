"use client";

import { AdminOverviewSection } from "@/components/admin/admin-overview-section";
import { useAdminStaff } from "@/components/admin/admin-staff-context";

export default function AdminOverviewPage() {
  const { viewerRole } = useAdminStaff();
  return <AdminOverviewSection viewerRole={viewerRole} />;
}

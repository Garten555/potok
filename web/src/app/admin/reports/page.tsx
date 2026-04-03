"use client";

import { AdminReportsSection } from "@/components/admin/admin-reports-section";
import { useAdminStaff } from "@/components/admin/admin-staff-context";

export default function AdminReportsPage() {
  const { viewerRole } = useAdminStaff();
  return <AdminReportsSection viewerRole={viewerRole} />;
}

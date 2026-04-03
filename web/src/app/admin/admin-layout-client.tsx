"use client";

import { AdminGate } from "@/components/admin/admin-gate";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}

"use client";

import { createContext, useContext } from "react";

type AdminStaffCtx = { viewerRole: string | null };

const AdminStaffContext = createContext<AdminStaffCtx>({ viewerRole: null });

export function AdminStaffProvider({
  viewerRole,
  children,
}: {
  viewerRole: string | null;
  children: React.ReactNode;
}) {
  return <AdminStaffContext.Provider value={{ viewerRole }}>{children}</AdminStaffContext.Provider>;
}

export function useAdminStaff() {
  return useContext(AdminStaffContext);
}

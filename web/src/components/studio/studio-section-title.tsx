"use client";

import type { ReactNode } from "react";

export function StudioSectionTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold text-slate-100">{children}</h1>;
}


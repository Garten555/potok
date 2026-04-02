"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

export function StudioCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-white/10 bg-[#10182a] p-3 sm:p-4 md:p-5", className)}>{children}</div>
  );
}


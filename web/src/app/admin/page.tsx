import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AdminPanel } from "./admin-panel";

function AdminFallback() {
  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-slate-400">Загрузка...</main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminPanel />
    </Suspense>
  );
}

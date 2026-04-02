import { HomePageClient } from "@/components/home/home-page-client";
import { redirect } from "next/navigation";

type HomeProps = {
  searchParams?: {
    tab?: string;
    q?: string | string[];
  };
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const tab = sp?.tab;
  const qParam = sp?.q;
  const q = Array.isArray(qParam) ? qParam[0] : qParam;

  if (tab === "search" && q) {
    redirect(`/search?q=${encodeURIComponent(q)}`);
  }

  if (tab === "history") {
    redirect("/history");
  }

  if (tab === "favorites") {
    redirect("/favorites");
  }

  return <HomePageClient />;
}

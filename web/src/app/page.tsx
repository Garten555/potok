import { Suspense } from "react";
import { HomePageClient } from "@/components/home/home-page-client";
import { redirect } from "next/navigation";
import { homeFeedCodeFromParams } from "@/lib/home-feed-param";

type HomeProps = {
  searchParams?: {
    f?: string;
    tab?: string;
    q?: string | string[];
  };
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const qParam = sp?.q;
  const q = Array.isArray(qParam) ? qParam[0] : qParam;

  const code = homeFeedCodeFromParams(sp ?? {});

  if (code === "s" && q && typeof q === "string") {
    redirect(`/search?q=${encodeURIComponent(q)}`);
  }

  if (code === "h") {
    redirect("/history");
  }

  if (code === "u") {
    redirect("/subscriptions");
  }

  if (code === "l") {
    redirect("/favorites");
  }

  const openTrendingFeed = code === "t";

  return (
    <Suspense fallback={<div className="min-h-[50vh] w-full animate-pulse bg-white/[0.02]" aria-hidden />}>
      <HomePageClient openTrendingFeed={openTrendingFeed} />
    </Suspense>
  );
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Карта сайта для поисковых систем (внутренняя SEO). Публичные маршруты. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  const paths = [
    "",
    "/auth",
    "/search",
    "/subscriptions",
    "/favorites",
    "/playlists",
    "/history",
    "/rules",
    "/privacy",
    "/offer",
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
    priority: path === "" ? 1 : 0.7,
  }));
}

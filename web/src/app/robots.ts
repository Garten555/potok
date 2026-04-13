import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Правила обхода для роботов и ссылка на sitemap.xml */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/studio", "/settings", "/account/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

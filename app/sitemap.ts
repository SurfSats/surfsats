import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";

const BASE = "https://www.surfsats.com";

const routes = [
  "/",
  "/jukebox",
  "/music",
  "/arcade",
  "/tab",
  "/graffiti",
  "/tidechain",
  "/lineup",
  "/signal",
  "/tools",
  "/fiat",
  "/story",
  "/about",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = routes.map((path) => ({
    url: path === "/" ? BASE : `${BASE}${path}`,
  }));

  const articles = getArticles().map((article) => ({
    url: `${BASE}/articles/${article.slug}`,
    lastModified: article.date,
  }));

  return [...pages, ...articles];
}

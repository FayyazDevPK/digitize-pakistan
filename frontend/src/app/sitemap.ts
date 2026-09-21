import type { MetadataRoute } from "next";
import { getContentList } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

const ARTICLE_TYPES = new Set(["NEWS", "TUTORIAL", "GUIDE"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getContentList();

  const articleUrls: MetadataRoute.Sitemap = items
    .filter((item) => ARTICLE_TYPES.has(item.type))
    .map((item) => ({
      url: `${SITE_URL}/news/${item.slug}`,
      lastModified: item.published_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  const toolUrls: MetadataRoute.Sitemap = items
    .filter((item) => item.type === "TOOL_LISTING")
    .map((item) => ({
      url: `${SITE_URL}/tools/${item.slug}`,
      lastModified: item.published_at ?? undefined,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/news`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/tools`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.1,
    },
    ...articleUrls,
    ...toolUrls,
  ];
}

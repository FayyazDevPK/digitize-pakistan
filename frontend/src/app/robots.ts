import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/my-learning",
        "/rewards",
        "/kyc",
        "/creator",
        "/settings",
        "/referrals",
        "/notifications",
        "/learning-paths",
        "/login",
        "/register",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

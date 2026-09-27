import type { Metadata } from "next";
import NewsPageContent from "@/components/NewsPageContent";
import { SITE_NAME } from "@/lib/site";

const TITLE = "News — Digitize Pakistan";
const DESCRIPTION =
  "The latest AI news from Pakistan and around the world — policy, funding, tools, and how-tos. Read to earn points.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/news" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/news",
  },
};

export default function NewsPage() {
  return <NewsPageContent />;
}

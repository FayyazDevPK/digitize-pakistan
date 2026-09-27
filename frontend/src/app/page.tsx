import type { Metadata } from "next";
import NewsPageContent from "@/components/NewsPageContent";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Digitize Pakistan — AI News, Tools & Learning";
const DESCRIPTION =
  "AI news, tools and learning paths for Pakistan — read, learn, and earn real cash rewards for your time.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/",
  },
};

export default function RootPage() {
  return <NewsPageContent />;
}

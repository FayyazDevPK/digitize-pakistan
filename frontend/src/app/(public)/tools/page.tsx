import Link from "next/link";
import type { Metadata } from "next";
import { getContentCategories, getContentList, ContentSort } from "@/lib/content";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { SITE_NAME } from "@/lib/site";

const TITLE = "AI Tool Directory — Digitize Pakistan";
const DESCRIPTION =
  "A curated directory of AI tools reviewed for Pakistani users — writing, speech, documents, dev, and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/tools",
  },
};

const SORTS: { key: ContentSort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "alphabetical", label: "A–Z" },
  { key: "popular", label: "Popular" },
];

function toolsHref(category?: string, sort?: ContentSort) {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (sort && sort !== "newest") qs.set("sort", sort);
  const q = qs.toString();
  return q ? `/tools?${q}` : "/tools";
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort: ContentSort = SORTS.some((s) => s.key === params.sort)
    ? (params.sort as ContentSort)
    : "newest";
  const category = params.category || undefined;

  const [items, categories] = await Promise.all([
    getContentList("TOOL_LISTING", { category, sort }),
    getContentCategories("TOOL_LISTING"),
  ]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="AI Tools" />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-8 md:py-12 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-8 items-end">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">
              CURATED · TESTED · PRICED IN PKR
            </span>
            <h1 className="font-display text-5xl md:text-[64px] leading-none m-0">
              The AI Tool Directory
            </h1>
            <p className="text-lg text-graphite max-w-[620px] leading-[1.5] m-0">
              Every tool reviewed by our editors, with notes on Urdu support, local payment
              options and what it&apos;s actually good for.
            </p>
          </div>
          <div className="hidden md:flex h-14 bg-white border border-border-strong rounded-2xl items-center gap-3 pl-[18px] pr-2 text-[15px] text-[#8A8F9C]">
            <span className="w-[13px] h-[13px] border-2 border-[#8A8F9C] rounded-full shrink-0" />
            <span className="flex-1">Search tools, e.g. &quot;Urdu voice&quot;</span>
            <span className="bg-ink text-white text-[13px] font-semibold px-3.5 py-2.5 rounded-[10px]">
              Search
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[13px] font-medium">
          <Link
            href={toolsHref(undefined, sort)}
            className={`px-3.5 py-2 rounded-full ${
              !category ? "bg-ink text-white" : "bg-white border border-border"
            }`}
          >
            All tools
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={toolsHref(c.slug, sort)}
              className={`px-3.5 py-2 rounded-full ${
                category === c.slug ? "bg-ink text-white" : "bg-white border border-border"
              }`}
            >
              {c.name}
            </Link>
          ))}
          <span className="flex-1" />
          <span className="text-muted">{items.length} listed</span>
          <span className="text-muted ml-2">Sort</span>
          <span className="flex bg-[#E9E8E1] rounded-[10px] p-[3px]">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={toolsHref(category, s.key)}
                className={`px-2.5 py-1.5 rounded-lg ${
                  sort === s.key ? "bg-white font-semibold" : "text-muted"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </span>
        </div>

        {items.length === 0 && (
          <p className="font-mono text-sm text-muted py-6">
            {category ? "No tools in this category." : "No tools listed yet."}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="bg-white border border-border rounded-[18px] p-[22px] flex flex-col gap-4 hover:border-ink transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[13px] bg-[#E7E2D9] shrink-0" />
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="text-[17px] font-bold truncate">{tool.title}</span>
                  <span className="font-mono text-[11px] tracking-[.08em] text-muted uppercase truncate">
                    {tool.category?.name}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full shrink-0 ${
                    tool.visibility === "PREMIUM_ONLY"
                      ? "bg-premium-bg text-premium"
                      : "bg-mint text-primary-deep"
                  }`}
                >
                  {tool.visibility === "PREMIUM_ONLY" ? "Paid" : "Free"}
                </span>
              </div>
              <p className="text-sm leading-[1.5] text-graphite m-0 min-h-[42px]">
                {tool.excerpt}
              </p>
              <div className="flex justify-between items-center border-t border-[#EFEEE8] pt-3.5 text-[13px]">
                <span className="text-muted">Editor-reviewed</span>
                <span className="font-semibold">View tool →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

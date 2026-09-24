import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import { ContentItem } from "@/lib/content";
import { SITE_NAME } from "@/lib/site";

interface ContentDetail extends ContentItem {
  body: string;
  pros: string[];
  cons: string[];
  pricing_lines: string[];
  alternatives: { id: number; title: string; slug: string; category: { name: string } }[];
}

// countView=false for SEO metadata fetches so one page view increments view_count once.
async function getContent(slug: string, countView = true): Promise<ContentDetail | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/api/content/${slug}/${countView ? "" : "?count=0"}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getContent(slug, false);
  if (!tool || tool.type !== "TOOL_LISTING") return {};

  const title = `${tool.title} — AI Tool Directory — Digitize Pakistan`;
  const url = `/tools/${tool.slug}`;

  return {
    title,
    description: tool.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: tool.title,
      description: tool.excerpt,
      siteName: SITE_NAME,
      type: "website",
      url,
      ...(tool.cover_image_url ? { images: [tool.cover_image_url] } : {}),
    },
  };
}

export default async function ToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await getContent(slug);
  if (!tool || tool.type !== "TOOL_LISTING") notFound();

  const isPremium = tool.visibility === "PREMIUM_ONLY";

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="AI Tools" />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-8 md:py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <BackLink label="Tools" />
          <div className="flex gap-2 font-mono text-[11px] tracking-[.1em] text-muted">
            <span>AI TOOLS</span>
            <span>/</span>
            <span className="text-ink">{tool.title.toUpperCase()}</span>
          </div>
        </div>

        <div className="bg-white border border-border rounded-[24px] p-6 md:p-9 flex flex-col md:flex-row items-start md:items-center gap-7">
          <div className="w-24 h-24 rounded-[24px] bg-iris text-white flex items-center justify-center font-bold text-3xl shrink-0">
            {tool.title.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 flex flex-col gap-2.5">
            <h1 className="font-display text-4xl md:text-5xl leading-none m-0">{tool.title}</h1>
            <span className="text-lg text-graphite">{tool.excerpt}</span>
            <div className="flex gap-2 flex-wrap mt-1 text-xs font-semibold">
              <span
                className={`px-2.5 py-1.5 rounded-full ${
                  isPremium ? "bg-premium-bg text-premium" : "bg-mint text-primary-deep"
                }`}
              >
                {isPremium ? "Paid" : "Freemium"}
              </span>
              <span className="bg-paper px-2.5 py-1.5 rounded-full">
                {tool.category?.name}
              </span>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-2.5 w-full md:w-[220px]">
            <span className="flex-1 md:flex-none bg-primary text-white font-semibold text-[15px] text-center py-3.5 rounded-xl">
              Visit website ↗
            </span>
            <span className="flex-1 md:flex-none border border-border-strong font-semibold text-[15px] text-center py-3.5 rounded-xl">
              Save to my list
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8">
          <div className="flex flex-col gap-6">
            <div className="aspect-[16/8] rounded-[20px] bg-[repeating-linear-gradient(135deg,#E6E5DE_0,#E6E5DE_12px,#EDECE6_12px,#EDECE6_24px)] flex items-end p-4">
              <span className="font-mono text-[11px] text-muted bg-white px-2.5 py-1.5 rounded-md">
                product screenshot
              </span>
            </div>
            <h2 className="font-display text-3xl m-0">Our review</h2>
            <p className="text-lg leading-[1.7] text-graphite max-w-[720px] m-0 whitespace-pre-wrap">
              {tool.body}
            </p>
            {(tool.pros.length > 0 || tool.cons.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "GOOD FOR", color: "text-primary", items: tool.pros },
                  { label: "WATCH OUT FOR", color: "text-alert", items: tool.cons },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-2.5"
                  >
                    <span
                      className={`font-mono text-[11px] font-semibold tracking-[.1em] ${card.color}`}
                    >
                      {card.label}
                    </span>
                    {card.items.map((item) => (
                      <span key={item} className="text-[15px] leading-[1.5]">
                        {item}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {tool.tags && tool.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[11px] text-muted border border-border-strong rounded-full px-3 py-1"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            {tool.pricing_lines.length > 0 && (
              <div className="bg-white border border-border rounded-[20px] p-[22px] flex flex-col">
                <span className="font-mono text-[11px] tracking-[.12em] text-muted mb-2.5">
                  PRICING
                </span>
                {tool.pricing_lines.map((line) => (
                  <div key={line} className="py-3 border-t border-[#EFEEE8] text-sm">
                    {line}
                  </div>
                ))}
              </div>
            )}
            <div className="bg-ink text-white rounded-[20px] p-[22px] flex flex-col gap-2.5">
              <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
                LEARN IT
              </span>
              <span className="font-display text-2xl leading-[1.15]">
                Explore tools like this in our learning paths.
              </span>
            </div>
            {tool.alternatives.length > 0 && (
              <div className="bg-white border border-border rounded-[20px] p-[22px] flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[.12em] text-muted mb-1.5">
                  ALTERNATIVES
                </span>
                {tool.alternatives.map((alt) => (
                  <Link
                    key={alt.id}
                    href={`/tools/${alt.slug}`}
                    className="flex items-center gap-2.5 py-2 border-t border-[#EFEEE8]"
                  >
                    <div className="w-8 h-8 rounded-[9px] bg-iris text-white flex items-center justify-center font-bold text-xs">
                      {alt.title.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold flex-1">{alt.title}</span>
                    <span className="text-xs text-muted">{alt.category?.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

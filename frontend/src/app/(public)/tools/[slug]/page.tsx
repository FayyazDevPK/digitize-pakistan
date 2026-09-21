import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import { ContentItem } from "@/lib/content";
import { SITE_NAME } from "@/lib/site";

interface ContentDetail extends ContentItem {
  body: string;
}

async function getContent(slug: string): Promise<ContentDetail | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/api/content/${slug}/`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getContent(slug);
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

      <div className="max-w-[740px] mx-auto p-4 md:p-8">
        <div className="mb-4">
          <BackLink label="Tools" />
        </div>
        <div className="bg-paper-raised border border-border-strong rounded-[10px] overflow-hidden">
          <div className="bg-ink h-12 flex items-center px-5 md:px-[22px] gap-2.5">
            <span className="font-mono text-[11.5px] text-[#9BA1AD]">AI TOOLS</span>
            <span className="text-[#5A606C]">/</span>
            <span className="font-mono text-[11.5px] text-paper">{tool.title.toUpperCase()}</span>
          </div>

          <div className="p-5 md:p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
              <div className="w-[68px] h-[68px] rounded-[14px] bg-[#E7E2D9] shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-2xl md:text-[31px]">{tool.title}</h1>
                  {isPremium && (
                    <span className="bg-premium text-white text-[10px] font-semibold tracking-[.06em] px-2 py-1 rounded">
                      ★ PREMIUM
                    </span>
                  )}
                </div>
                <span className="text-sm text-graphite">{tool.excerpt}</span>
                <div className="flex gap-3.5 font-mono text-[11.5px] text-muted mt-0.5">
                  <span>{tool.category?.name?.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col gap-2">
                <span className="bg-vermilion text-white text-[13px] font-semibold px-4 py-2.5 rounded-[6px] text-center">
                  Visit tool
                </span>
                <span className="border border-border-strong text-[13px] px-4 py-2.5 rounded-[6px] text-center">
                  Save
                </span>
              </div>
            </div>

            <div className="h-[180px] bg-[#E7E2D9] rounded-lg flex items-center justify-center font-mono text-[11px] tracking-[.14em] text-[#8A8F9B]">
              PRODUCT SCREENSHOT
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-[.16em] border-b border-border pb-1.5">
                OUR TAKE
              </span>
              <p className="text-[15px] leading-[1.65] text-graphite whitespace-pre-wrap">
                {tool.body}
              </p>
            </div>

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
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import { ContentItem } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
  const article = await getContent(slug);
  if (!article) return {};

  const title = `${article.title} — Digitize Pakistan`;
  const url = `/news/${article.slug}`;

  return {
    title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      siteName: SITE_NAME,
      type: "article",
      url,
      ...(article.cover_image_url ? { images: [article.cover_image_url] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getContent(slug);
  if (!article) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.cover_image_url ? { image: [article.cover_image_url] } : {}),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: "Digitize Online SMC (Private) Limited",
    },
    mainEntityOfPage: `${SITE_URL}/news/${article.slug}`,
  };

  return (
    <div className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <PublicHeader active="News" />

      <div className="max-w-[1280px] mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-8">
        <div className="flex flex-col gap-[18px] min-w-0">
          <BackLink label="News" />
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-vermilion-deep">
              {article.category?.name?.toUpperCase() ?? "NEWS"}
            </span>
            {article.published_at && (
              <span className="font-mono text-[10.5px] text-muted">
                {new Date(article.published_at)
                  .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  .toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-[46px] leading-[1.06]">{article.title}</h1>
          {article.excerpt && (
            <p className="font-display italic text-lg md:text-xl leading-[1.45] text-ink/85">
              {article.excerpt}
            </p>
          )}

          <div className="h-[180px] md:h-[280px] bg-[#E7E2D9] rounded-lg flex items-center justify-center font-mono text-[11px] tracking-[.14em] text-[#8A8F9B]">
            ARTICLE IMAGE
          </div>

          <div
            className="text-[16px] md:text-[17px] leading-[1.68] text-ink/85 flex flex-col gap-4 whitespace-pre-wrap"
          >
            {article.body}
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-2">
              {article.tags.map((tag) => (
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

        <div className="flex flex-col gap-[18px]">
          <div className="bg-white border border-border rounded-[10px] p-[18px] flex flex-col gap-2.5">
            <span className="font-mono text-[10.5px] font-semibold tracking-[.16em]">CATEGORY</span>
            <span className="text-[13.5px] font-medium">{article.category?.name}</span>
          </div>
          <div className="bg-ink rounded-[10px] p-5 flex flex-col gap-1.5">
            <span className="font-mono text-[10.5px] tracking-[.14em] text-[#FF7A52]">
              READ TO EARN
            </span>
            <span className="text-[14px] text-[#E6E8EC]">
              Log in and finish this article to credit points to your balance.
            </span>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

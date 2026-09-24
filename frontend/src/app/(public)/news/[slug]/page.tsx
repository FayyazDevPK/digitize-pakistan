import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ArticleReadToEarn from "@/components/ArticleReadToEarn";
import ReadingProgress from "@/components/ReadingProgress";
import BackLink from "@/components/BackLink";
import { ContentItem } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { safeJsonLd } from "@/lib/json-ld";

interface ContentDetail extends ContentItem {
  body: string;
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
  const article = await getContent(slug, false);
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
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: "Digitize Online SMC (Private) Limited" },
    mainEntityOfPage: `${SITE_URL}/news/${article.slug}`,
  };

  return (
    <div className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
      <PublicHeader active="News" />

      <ReadingProgress targetId="article-body" />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-10 md:gap-16">
        <article id="article-body" className="flex flex-col gap-6 max-w-[780px] lg:ml-10 min-w-0">
          <BackLink label="News" />
          <div className="flex gap-2 font-mono text-[11px] tracking-[.1em] text-muted">
            <span>NEWS</span>
            <span>/</span>
            <span className="text-primary">{article.category?.name?.toUpperCase() ?? "GENERAL"}</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.02] m-0">{article.title}</h1>
          {article.excerpt && (
            <p className="text-xl leading-[1.5] text-graphite m-0">{article.excerpt}</p>
          )}

          <div className="flex items-center gap-3 py-4 border-y border-border text-sm text-muted flex-wrap">
            <span className="w-9 h-9 rounded-full bg-border-strong shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-ink font-semibold">{article.author_name}</span>
              <span className="text-xs">
                {article.published_at &&
                  new Date(article.published_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
              </span>
            </div>
            <span className="flex-1" />
            <span className="border border-border-strong rounded-[9px] px-3 py-2 text-xs font-semibold text-ink">
              Share
            </span>
            <span className="border border-border-strong rounded-[9px] px-3 py-2 text-xs font-semibold text-ink">
              Save
            </span>
          </div>

          <div className="aspect-video rounded-[18px] bg-[repeating-linear-gradient(135deg,#E6E5DE_0,#E6E5DE_12px,#EDECE6_12px,#EDECE6_24px)] flex items-end p-4">
            <span className="font-mono text-[11px] text-muted bg-white px-2.5 py-1.5 rounded-md">
              article image · 16:9
            </span>
          </div>

          <div className="text-lg leading-[1.75] text-graphite flex flex-col gap-5 whitespace-pre-wrap">
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
        </article>

        <aside className="flex flex-col gap-4 pt-11">
          <ArticleReadToEarn />
          <div className="bg-white border border-border rounded-[20px] p-5 flex flex-col gap-2.5">
            <span className="font-mono text-[11px] tracking-[.12em] text-muted">CATEGORY</span>
            <span className="text-sm font-semibold">{article.category?.name}</span>
          </div>
        </aside>
      </div>
      <PublicFooter />
    </div>
  );
}

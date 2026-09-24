import Link from "next/link";
import type { Metadata } from "next";
import { getContentList } from "@/lib/content";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ReadToEarnCard from "@/components/ReadToEarnCard";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { safeJsonLd } from "@/lib/json-ld";

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

interface AdSlotData {
  id: number;
  placement: string;
  slot_type: string;
  advertiser_name: string;
  image_url: string;
  target_url: string;
}

async function getAd(placement: string): Promise<AdSlotData | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/api/ads/?placement=${placement}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const slot = (data as AdSlotData[]).find((s) => s.image_url && s.target_url);
  return slot ?? null;
}

export default async function NewsPage() {
  const dateLabel = new Date()
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  const [items, mostRead, tools, ad, sidebarAd] = await Promise.all([
    getContentList("NEWS"),
    getContentList("NEWS", { sort: "popular" }),
    getContentList("TOOL_LISTING"),
    getAd("ARTICLE_INLINE"),
    getAd("SIDEBAR"),
  ]);

  const [lead, ...rest] = items;
  const topRead = mostRead.filter((m) => m.view_count > 0).slice(0, 5);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Digitize Online SMC (Private) Limited",
    url: `${SITE_URL}/`,
    description:
      "Operator of Digitize Pakistan — AI news, tools, and learning paths, with a read-to-earn rewards system for readers in Pakistan.",
  };

  return (
    <div className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
      />
      <PublicHeader active="News" />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 pt-8 md:pt-10 pb-16 md:pb-[72px] flex flex-col gap-8 md:gap-10">
        <div className="flex items-end justify-between gap-4 flex-wrap border-b-2 border-ink pb-4 md:pb-[18px]">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[.12em] text-muted">
              {dateLabel}
            </span>
            <h1 className="font-display text-4xl md:text-[56px] leading-none m-0">Today in AI</h1>
          </div>
          <div className="hidden md:flex gap-2 text-[13px] font-medium">
            <span className="bg-ink text-white px-3.5 py-2 rounded-full">All</span>
            <span className="border border-border-strong px-3 py-[7px] rounded-full">Policy</span>
            <span className="border border-border-strong px-3 py-[7px] rounded-full">
              Research
            </span>
            <span className="border border-border-strong px-3 py-[7px] rounded-full">
              Products
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-8 md:gap-10">
          {lead && (
            <article className="flex flex-col gap-5">
              <Link
                href={`/news/${lead.slug}`}
                className="aspect-video rounded-[18px] bg-[repeating-linear-gradient(135deg,#E6E5DE_0,#E6E5DE_12px,#EDECE6_12px,#EDECE6_24px)] flex items-end p-4"
              >
                <span className="font-mono text-[11px] text-muted bg-white px-2.5 py-1.5 rounded-md">
                  lead image · 16:9
                </span>
              </Link>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-primary">
                  {lead.category?.name?.toUpperCase() ?? "NEWS"}
                </span>
                {lead.view_count > 0 && (
                  <>
                    <span className="text-border-strong">·</span>
                    <span className="text-[13px] text-muted">
                      {lead.view_count.toLocaleString()} views
                    </span>
                  </>
                )}
                <span className="flex-1" />
                <span className="font-mono text-[11px] font-semibold bg-premium-bg text-premium px-2.5 py-[6px] rounded-md">
                  READ TO EARN
                </span>
              </div>
              <Link href={`/news/${lead.slug}`}>
                <h2 className="font-display text-3xl md:text-5xl leading-[1.02] m-0">
                  {lead.title}
                </h2>
              </Link>
              <p className="text-lg leading-[1.55] text-graphite max-w-[760px] m-0">
                {lead.excerpt}
              </p>
              <span className="text-sm text-muted">
                By <span className="text-ink font-semibold">{lead.author_name}</span>
              </span>
            </article>
          )}

          <aside className="flex flex-col gap-5">
            <ReadToEarnCard />

            <div className="bg-white border border-border rounded-[20px] p-6 flex flex-col gap-3.5">
              <div className="flex justify-between items-baseline">
                <h3 className="font-display text-2xl m-0">AI Tool Directory</h3>
                <Link href="/tools" className="text-sm font-semibold text-primary">
                  Browse →
                </Link>
              </div>
              {tools.length === 0 && <p className="text-sm text-muted">No tools listed yet.</p>}
              {tools.slice(0, 4).map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.slug}`}
                  className="flex items-center gap-3 py-2.5 border-t border-[#EFEEE8]"
                >
                  <div className="w-[38px] h-[38px] rounded-[10px] bg-[#E7E2D9] shrink-0" />
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold truncate">{tool.title}</span>
                    <span className="text-xs text-muted truncate">{tool.excerpt}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted border border-border rounded-md px-[7px] py-[5px] shrink-0">
                    {tool.visibility === "PREMIUM_ONLY" ? "PAID" : "FREE"}
                  </span>
                </Link>
              ))}
            </div>

            {sidebarAd && (
              <a
                href={sidebarAd.target_url}
                target="_blank"
                rel="noopener sponsored"
                className="block bg-white border border-border rounded-[20px] p-5"
              >
                <div className="font-mono text-[10px] uppercase text-muted mb-2">Sponsored</div>
                {sidebarAd.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sidebarAd.image_url}
                    alt={sidebarAd.advertiser_name}
                    className="w-full rounded-sm border border-border"
                  />
                )}
                <div className="text-xs text-muted mt-1">{sidebarAd.advertiser_name}</div>
              </a>
            )}
          </aside>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-8 md:gap-10">
          <div className="flex flex-col">
            <div className="flex justify-between items-baseline pb-3 border-b border-ink">
              <h3 className="font-display text-2xl md:text-[32px] m-0">Latest</h3>
              <span className="font-mono text-[11px] text-muted hidden sm:inline">
                {rest.length} more
              </span>
            </div>
            {rest.length === 0 && !lead && (
              <p className="font-mono text-sm text-muted py-6">No news yet.</p>
            )}
            {rest.map((item, index) => (
              <div key={item.id}>
                <Link
                  href={`/news/${item.slug}`}
                  className="grid grid-cols-[70px_minmax(0,1fr)] sm:grid-cols-[90px_minmax(0,1fr)_140px] gap-4 md:gap-6 py-5 border-b border-border items-start"
                >
                  <span className="font-mono text-xs text-muted">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-primary">
                      {item.category?.name?.toUpperCase() ?? "NEWS"}
                    </span>
                    <span className="font-display text-xl md:text-[26px] leading-[1.1]">
                      {item.title}
                    </span>
                    <span className="text-sm text-muted leading-[1.4] hidden sm:block">
                      {item.excerpt}
                    </span>
                    <span className="text-xs text-muted">By {item.author_name}</span>
                  </div>
                  <div className="hidden sm:block w-[140px] aspect-[4/3] rounded-xl bg-[repeating-linear-gradient(135deg,#E6E5DE_0,#E6E5DE_10px,#EDECE6_10px,#EDECE6_20px)]" />
                </Link>
                {index === 0 && ad && (
                  <a
                    href={ad.target_url}
                    target="_blank"
                    rel="noopener sponsored"
                    className="block py-4 border-b border-border"
                  >
                    <div className="font-mono text-[10px] uppercase text-muted mb-2">
                      Sponsored
                    </div>
                    {ad.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ad.image_url}
                        alt={ad.advertiser_name}
                        className="w-full rounded-sm border border-border"
                      />
                    )}
                    <div className="text-xs text-muted mt-1">{ad.advertiser_name}</div>
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white border border-border rounded-[20px] p-6 flex flex-col gap-3">
              <span className="font-mono text-[11px] tracking-[.12em] text-muted">MOST READ</span>
              {topRead.length === 0 && (
                <p className="text-sm text-muted m-0">
                  The most-read stories appear here once readers open them.
                </p>
              )}
              {topRead.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/news/${m.slug}`}
                  className="grid grid-cols-[32px_1fr] gap-2.5 py-2.5 border-t border-[#EFEEE8]"
                >
                  <span className="font-display text-[30px] leading-none text-primary">{i + 1}</span>
                  <span className="text-[15px] font-medium leading-[1.35]">{m.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

import Link from "next/link";
import { getContentList } from "@/lib/content";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ReadToEarnCard from "@/components/ReadToEarnCard";

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
  // Only DIRECT slots with an image + link render as a "Sponsored" block —
  // ADSENSE slots need the AdSense script, which isn't wired up yet.
  const slot = (data as AdSlotData[]).find((s) => s.image_url && s.target_url);
  return slot ?? null;
}

export default async function NewsPage() {
  const [items, tools, ad, sidebarAd] = await Promise.all([
    getContentList("NEWS"),
    getContentList("TOOL_LISTING"),
    getAd("ARTICLE_INLINE"),
    getAd("SIDEBAR"),
  ]);

  const [lead, ...rest] = items;

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="News" />

      <div className="max-w-[1280px] mx-auto p-4 md:p-7 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-7">
        <div className="flex flex-col gap-[22px] min-w-0">
          {lead && (
            <article className="bg-white border border-border rounded-[10px] overflow-hidden">
              <div className="h-[160px] md:h-[210px] bg-[#E7E2D9] flex items-center justify-center font-mono text-[11px] tracking-[.14em] text-[#8A8F9B] border-b border-border">
                LEAD IMAGE 16:9
              </div>
              <div className="px-5 md:px-6 pt-[22px] pb-6 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-vermilion-deep">
                    {lead.category?.name?.toUpperCase() ?? "NEWS"}
                  </span>
                  {lead.view_count > 0 && (
                    <span className="font-mono text-[10.5px] text-muted">
                      {lead.view_count.toLocaleString()} VIEWS
                    </span>
                  )}
                </div>
                <Link href={`/news/${lead.slug}`}>
                  <h1 className="font-display text-2xl md:text-4xl leading-[1.08] hover:text-vermilion-deep transition-colors">
                    {lead.title}
                  </h1>
                </Link>
                <p className="text-[15px] leading-[1.6] text-ink/85">{lead.excerpt}</p>
              </div>
            </article>
          )}

          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-1">
              <span className="font-mono text-[11px] font-semibold tracking-[.16em]">LATEST</span>
              <Link href="/news" className="text-[12.5px] text-vermilion-deep font-medium">
                All news →
              </Link>
            </div>
            {rest.length === 0 && lead === undefined && (
              <p className="font-mono text-sm text-muted py-6">No news yet.</p>
            )}
            {rest.map((item, index) => (
              <div key={item.id}>
                <Link
                  href={`/news/${item.slug}`}
                  className="flex gap-4 py-4 border-b border-border"
                >
                  <div className="w-[90px] md:w-[120px] h-[64px] md:h-[78px] bg-[#E7E2D9] rounded-md shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] font-semibold tracking-[.14em] text-vermilion-deep">
                      {item.category?.name?.toUpperCase() ?? "NEWS"}
                    </span>
                    <span className="font-display text-lg md:text-xl leading-[1.15]">
                      {item.title}
                    </span>
                  </div>
                </Link>
                {index === 0 && ad && (
                  <a
                    href={ad.target_url}
                    target="_blank"
                    rel="noopener sponsored"
                    className="block py-4 border-b border-border"
                  >
                    <div className="font-mono text-[10px] uppercase text-muted mb-2">Sponsored</div>
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
        </div>

        <div className="flex flex-col gap-5">
          <ReadToEarnCard />

          <div className="bg-white border border-border rounded-[10px] overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold tracking-[.16em]">
                TOOL DIRECTORY
              </span>
              <Link href="/tools" className="text-[12.5px] text-vermilion-deep font-medium">
                Browse all →
              </Link>
            </div>
            {tools.length === 0 && (
              <p className="text-sm text-muted px-[18px] py-4">No tools listed yet.</p>
            )}
            {tools.slice(0, 3).map((tool, i) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`flex items-center gap-3 px-[18px] py-3.5 ${
                  i < Math.min(tools.length, 3) - 1 ? "border-b border-[#F0EDE7]" : ""
                }`}
              >
                <div className="w-[34px] h-[34px] rounded-lg bg-[#E7E2D9] shrink-0" />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate">{tool.title}</span>
                  <span className="text-xs text-muted truncate">{tool.excerpt}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded shrink-0 ${
                    tool.visibility === "PREMIUM_ONLY"
                      ? "bg-premium text-white"
                      : "border border-[#9AA0AC] text-[#4E5463]"
                  }`}
                >
                  {tool.visibility === "PREMIUM_ONLY" ? "★ PREMIUM" : "FREE"}
                </span>
              </Link>
            ))}
          </div>

          {sidebarAd && (
            <a
              href={sidebarAd.target_url}
              target="_blank"
              rel="noopener sponsored"
              className="block bg-white border border-border rounded-[10px] p-[18px]"
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
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

import { getContentList } from "@/lib/content";

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
  return data[0] ?? null;
}

export default async function NewsPage() {
  const items = await getContentList("NEWS");
  const ad = await getAd("ARTICLE_INLINE");

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4 pb-16">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase text-muted mb-1">
          Digitize Pakistan
        </div>
        <h1 className="font-display text-4xl">News</h1>
      </div>

      {items.length === 0 && (
        <p className="font-mono text-sm text-muted">No news yet.</p>
      )}

      <div className="border-t border-border-strong">
        {items.map((item, index) => (
          <div key={item.id}>
            <article className="py-5 border-b border-border">
              <div className="font-mono text-[11px] uppercase text-muted mb-1.5 tracking-wide">
                {item.category?.name ?? "News"}
              </div>
              <h2 className="font-display text-xl leading-snug mb-1.5">{item.title}</h2>
              <p className="text-sm text-muted leading-relaxed">{item.excerpt}</p>
            </article>
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
    </div>
  );
}

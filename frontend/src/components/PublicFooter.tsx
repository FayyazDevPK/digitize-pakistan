import Link from "next/link";

const LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

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

export default async function PublicFooter() {
  const ad = await getAd("FOOTER");

  return (
    <footer className="border-t border-border mt-10">
      {ad && (
        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener sponsored"
          className="block max-w-[1280px] mx-auto px-4 md:px-7 pt-6"
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
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-muted">
          © {new Date().getFullYear()} Digitize Online SMC (Private) Limited
        </span>
        <div className="flex gap-5">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="text-[13px] text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

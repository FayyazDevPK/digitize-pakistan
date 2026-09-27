import Link from "next/link";
import PixelD from "@/components/PixelD";
import NewsletterSignup from "@/components/NewsletterSignup";
import AdSenseUnit from "@/components/AdSenseUnit";
import { getAd } from "@/lib/ads";

const COLUMNS: { title: string; links: { label: string; href?: string }[] }[] =
  [
    {
      title: "Read",
      links: [
        { label: "Latest news", href: "/news" },
        { label: "Policy & regulation" },
        { label: "Research" },
        { label: "Startups in Pakistan" },
      ],
    },
    {
      title: "Earn",
      links: [
        { label: "How points work", href: "/rewards" },
        { label: "Learning paths", href: "/my-learning" },
        { label: "Referral program", href: "/referrals" },
        { label: "Creator studio", href: "/creator" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Careers" },
        { label: "Press kit" },
      ],
    },
  ];

export default async function PublicFooter() {
  const ad = await getAd("FOOTER");

  return (
    <>
      {ad && (
        <section aria-label="Sponsored" className="bg-paper px-4 py-8 md:py-10">
          <div className="w-full max-w-[728px] mx-auto">
            <div className="font-mono text-[10px] uppercase tracking-[.1em] text-muted mb-1.5">
              Sponsored
            </div>
            {ad.slot_type === "ADSENSE" ? (
              <AdSenseUnit adClient={ad.ad_client} adSlot={ad.ad_slot_id} />
            ) : (
              <a href={ad.target_url} target="_blank" rel="noopener sponsored" className="block">
                {/* 728×90 leaderboard; 320×50 proportions below the sm breakpoint */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ad.image_url}
                  alt={ad.advertiser_name}
                  className="w-full aspect-[320/50] sm:aspect-[728/90] object-cover rounded-sm border border-border"
                />
                <div className="text-xs text-muted mt-1">{ad.advertiser_name}</div>
              </a>
            )}
          </div>
        </section>
      )}
      <footer className="bg-ink text-[#C9CFDC] font-sans flex flex-col gap-10 md:gap-12 px-6 md:px-12 pt-12 md:pt-16 pb-7">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr] gap-8 md:gap-10">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link href="/news" className="flex items-center gap-2.5">
              <PixelD size={8} onDark />
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="font-bold text-xl text-white tracking-tight">
                  Digitize
                </span>
                <span className="font-display italic text-2xl">Pakistan</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed max-w-[300px]">
              AI news, tools and learning for Pakistan — and a fair share of the
              value for your time.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <div className="font-mono text-[10px] tracking-[.12em] uppercase text-[#6E7890] mb-1">
                {col.title}
              </div>
              {col.links.map((l) =>
                l.href ? (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="text-sm text-[#C9CFDC]"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <span key={l.label} className="text-sm text-[#C9CFDC]">
                    {l.label}
                  </span>
                ),
              )}
            </div>
          ))}

          <div className="col-span-2 md:col-span-1 bg-ink-raised border border-[#24304A] rounded-[18px] p-5 flex flex-col gap-3.5">
            <div className="font-mono text-[10px] tracking-[.12em] uppercase text-[#6E7890]">
              Current payout rate
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[28px] font-semibold text-white">
                1,000
              </span>
              <span className="text-[13px]">pts</span>
              <span className="text-[#6E7890]">=</span>
              <span className="font-mono text-[28px] font-semibold text-marigold">
                Rs 250
              </span>
            </div>
            <div className="text-xs leading-relaxed text-muted-2">
              Withdrawals to JazzCash, Easypaisa or bank. Identity verification
              required before first payout.
            </div>
            <NewsletterSignup />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 border-t border-[#24304A] pt-[22px] text-xs text-muted-2">
          <span>
            © {new Date().getFullYear()} Digitize Online SMC (Private) Limited ·
            Karachi, Pakistan
          </span>
          <span className="flex-1" />
          <Link href="/terms" className="text-[#C9CFDC]">
            Terms
          </Link>
          <Link href="/privacy" className="text-[#C9CFDC]">
            Privacy
          </Link>
          <Link href="/payout-policy" className="text-[#C9CFDC]">
            Payout policy
          </Link>
        </div>
      </footer>
    </>
  );
}

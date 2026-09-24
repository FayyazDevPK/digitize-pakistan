import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import InfoPageNav from "@/components/InfoPageNav";
import { SITE_NAME } from "@/lib/site";

const TITLE = "About — Digitize Pakistan";
const DESCRIPTION =
  "Digitize Pakistan is a platform for AI news, tools, and learning paths with a read-to-earn rewards system, operated by Digitize Online SMC (Private) Limited.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <PublicHeader />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-10 md:py-14 w-full flex-1 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-10 md:gap-16">
        <InfoPageNav active="/about" />

        <div className="flex flex-col gap-9 max-w-[900px]">
          <BackLink />
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">ABOUT</span>
            <h1 className="font-display text-5xl md:text-6xl leading-none m-0">
              A newsroom that pays you back.
            </h1>
          </div>

          <div className="text-[17px] leading-[1.65] text-graphite flex flex-col gap-7">
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">What we are</h2>
              <p className="m-0">
                Digitize Pakistan is a platform for AI news, a curated directory of AI tools, and
                structured learning paths — built around a read-to-earn rewards system that pays
                members in points, redeemable for cash, for reading articles and completing
                lessons.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Who operates it</h2>
              <p className="m-0">
                The platform is operated by Digitize Online SMC (Private) Limited, based in
                Karachi, Pakistan.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Our mission</h2>
              <p className="m-0">
                We want to make it easy for people in Pakistan to keep up with AI, find tools
                worth using, and get paid for the time they already spend learning.
              </p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

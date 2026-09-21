import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
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

      <div className="max-w-2xl mx-auto px-4 md:px-0 pt-10 pb-16 w-full flex-1">
        <BackLink />

        <h1 className="font-display text-4xl mt-4 mb-8">About Digitize Pakistan</h1>

        <div className="prose text-sm text-ink/90 leading-relaxed space-y-5">
          <section>
            <h2 className="font-display text-xl mb-2">What we are</h2>
            <p>
              Digitize Pakistan is a platform for AI news, a curated directory of AI tools, and
              structured learning paths — built around a read-to-earn rewards system that pays
              members in points, redeemable for cash, for reading articles and completing lessons.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Who operates it</h2>
            <p>
              The platform is operated by Digitize Online SMC (Private) Limited, based in Karachi,
              Pakistan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Our mission</h2>
            <p>
              We want to make it easy for people in Pakistan to keep up with AI, find tools worth
              using, and get paid for the time they already spend learning.
            </p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import InfoPageNav from "@/components/InfoPageNav";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Privacy Policy — Digitize Pakistan";
const DESCRIPTION =
  "How Digitize Pakistan collects, uses, and protects your information, including KYC documents and advertising cookies.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <PublicHeader />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-10 md:py-14 w-full flex-1 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-10 md:gap-16">
        <InfoPageNav active="/privacy" />

        <div className="flex flex-col gap-9 max-w-[900px]">
          <BackLink />
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">LEGAL</span>
            <h1 className="font-display text-5xl md:text-6xl leading-none m-0">
              Privacy Policy
            </h1>
            <p className="font-mono text-xs text-muted m-0">Last updated: September 2026</p>
          </div>

          <div className="text-[17px] leading-[1.65] text-graphite flex flex-col gap-7">
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Who we are</h2>
              <p className="m-0">
                Digitize Pakistan is operated by Digitize Online SMC (Private) Limited, based in
                Karachi, Pakistan.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Information we collect</h2>
              <p className="m-0">
                We collect account information you provide (username, email), activity data
                (reading history, learning-path progress, referrals), and KYC documents when you
                submit them for reward withdrawal eligibility. KYC documents are used solely for
                identity verification and fraud prevention.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Cookies and advertising</h2>
              <p className="m-0">
                We use cookies to keep you logged in and to remember your preferences. We work
                with third-party advertising partners, including Google AdSense, who may use
                cookies to serve ads based on your visits to this and other sites. You can control
                ad personalization through{" "}
                <a
                  href="https://adssettings.google.com"
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google&apos;s Ads Settings
                </a>
                .
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">How we use your information</h2>
              <p className="m-0">
                We use your information to operate the platform, calculate and pay rewards,
                prevent fraud, and improve the service. We do not sell your personal information
                to third parties.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Your choices</h2>
              <p className="m-0">
                You can update your profile information in Settings, and request account deletion
                by contacting us. KYC documents are retained only as long as required for
                compliance purposes.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Contact</h2>
              <p className="m-0">
                For privacy questions, contact Digitize Online SMC (Private) Limited via our{" "}
                <a href="/contact" className="text-primary underline">
                  contact page
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import InfoPageNav from "@/components/InfoPageNav";
import { SITE_NAME } from "@/lib/site";
import { CREATOR_BOUNTY } from "@/lib/rewards";

const TITLE = "Terms of Service — Digitize Pakistan";
const DESCRIPTION =
  "The terms that govern using Digitize Pakistan, including the rewards system, withdrawals, the Creator Program, and prohibited conduct.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <PublicHeader />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-10 md:py-14 w-full flex-1 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-10 md:gap-16">
        <InfoPageNav active="/terms" />

        <div className="flex flex-col gap-9 max-w-[900px]">
          <BackLink />
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">LEGAL</span>
            <h1 className="font-display text-5xl md:text-6xl leading-none m-0">
              Terms of Service
            </h1>
            <p className="font-mono text-xs text-muted m-0">Last updated: September 2026</p>
          </div>

          <div className="text-[17px] leading-[1.65] text-graphite flex flex-col gap-7">
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Acceptance of terms</h2>
              <p className="m-0">
                By creating an account or using Digitize Pakistan, operated by Digitize Online
                SMC (Private) Limited, you agree to these terms. If you don&apos;t agree, please
                don&apos;t use the platform.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Account eligibility</h2>
              <p className="m-0">
                You need a valid account to read-to-earn, take learning paths, or apply to the
                Creator Program. One account per person — accounts are not transferable.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Rewards and points</h2>
              <p className="m-0">
                You earn points for reading articles, completing learning-path milestones, and
                successful referrals. Points can be converted to cash at 1,000 points = Rs 250.
                Withdrawals require a minimum balance of Rs 2,000 and an approved KYC submission,
                per State Bank of Pakistan requirements. Points keep accruing while a KYC
                submission is under review.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Creator Program</h2>
              <p className="m-0">
                Content you submit through the Creator Program remains yours, but by submitting
                it you grant Digitize Pakistan a license to publish, distribute, and monetize it
                on the platform. Approved creators are currently paid a fixed bounty of{" "}
                {CREATOR_BOUNTY} points for each piece of their content that we publish. The
                creator reward model may change with notice.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Prohibited conduct</h2>
              <p className="m-0">
                You may not create fake or duplicate accounts, use bots or automation to farm
                read-to-earn points, abuse the referral system with self-referrals or fabricated
                signups, submit fraudulent KYC documents, or otherwise attempt to manipulate the
                rewards system. Violations may result in forfeited points and account
                termination.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Termination</h2>
              <p className="m-0">
                We may suspend or terminate accounts that violate these terms. You may stop using
                the platform at any time; unpaid, unforfeited points remain payable subject to
                normal withdrawal rules.
              </p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

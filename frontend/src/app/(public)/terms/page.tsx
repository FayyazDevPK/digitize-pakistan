import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <PublicHeader />

      <div className="max-w-2xl mx-auto px-4 md:px-0 pt-10 pb-16 w-full flex-1">
        <BackLink />

        <h1 className="font-display text-4xl mt-4 mb-2">Terms of Service</h1>
        <p className="font-mono text-[11px] text-muted mb-8">Last updated: September 2026</p>

        <div className="prose text-sm text-ink/90 leading-relaxed space-y-5">
          <section>
            <h2 className="font-display text-xl mb-2">Acceptance of terms</h2>
            <p>
              By creating an account or using Digitize Pakistan, operated by Digitize Online SMC
              (Private) Limited, you agree to these terms. If you don&apos;t agree, please don&apos;t
              use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Account eligibility</h2>
            <p>
              You need a valid account to read-to-earn, take learning paths, or apply to the
              Creator Program. One account per person — accounts are not transferable.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Rewards and points</h2>
            <p>
              You earn points for reading articles, completing learning-path milestones, and
              successful referrals. Points can be converted to cash at 1,000 points = Rs 250.
              Withdrawals require a minimum balance of Rs 2,000 and an approved KYC submission,
              per State Bank of Pakistan requirements. Points keep accruing while a KYC submission
              is under review.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Creator Program</h2>
            <p>
              Content you submit through the Creator Program remains yours, but by submitting it
              you grant Digitize Pakistan a license to publish, distribute, and monetize it on the
              platform. Approved creators earn a revenue share on their published content as
              described in the Creator dashboard.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Prohibited conduct</h2>
            <p>
              You may not create fake or duplicate accounts, use bots or automation to farm
              read-to-earn points, abuse the referral system with self-referrals or fabricated
              signups, submit fraudulent KYC documents, or otherwise attempt to manipulate the
              rewards system. Violations may result in forfeited points and account termination.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these terms. You may stop using
              the platform at any time; unpaid, unforfeited points remain payable subject to normal
              withdrawal rules.
            </p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

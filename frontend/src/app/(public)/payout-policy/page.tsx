import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import InfoPageNav from "@/components/InfoPageNav";
import { SITE_NAME } from "@/lib/site";
import {
  MIN_WITHDRAWAL_POINTS,
  MIN_WITHDRAWAL_RS,
  POINTS_PER_UNIT,
  RS_PER_UNIT,
  WITHDRAWAL_REQUESTS_PER_HOUR,
} from "@/lib/payout";

const TITLE = "Payout Policy — Digitize Pakistan";
const DESCRIPTION =
  "How points convert to cash, the minimum withdrawal, identity verification, payout methods and processing times on Digitize Pakistan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/payout-policy" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/payout-policy",
  },
};

export default function PayoutPolicyPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <PublicHeader />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-10 md:py-14 w-full flex-1 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-10 md:gap-16">
        <InfoPageNav active="/payout-policy" />

        <div className="flex flex-col gap-9 max-w-[900px]">
          <BackLink />
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">PAYOUTS</span>
            <h1 className="font-display text-5xl md:text-6xl leading-none m-0">Payout Policy</h1>
            <p className="font-mono text-xs text-muted m-0">Last updated: September 2026</p>
          </div>

          <div className="text-[17px] leading-[1.65] text-graphite flex flex-col gap-7">
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Conversion rate</h2>
              <p className="m-0">
                Points convert to cash at a fixed rate of{" "}
                {POINTS_PER_UNIT.toLocaleString()} points = Rs {RS_PER_UNIT.toLocaleString()}. The
                rate is applied when you request a withdrawal; the rupee amount is shown before you
                submit.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Minimum withdrawal</h2>
              <p className="m-0">
                The minimum withdrawal is Rs {MIN_WITHDRAWAL_RS.toLocaleString()} (
                {MIN_WITHDRAWAL_POINTS.toLocaleString()} points). You can only withdraw points you
                have already earned; requests larger than your available balance are declined.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Identity verification</h2>
              <p className="m-0">
                Cash payouts in Pakistan must follow State Bank of Pakistan know-your-customer
                rules, so withdrawals are only available once your{" "}
                <Link href="/kyc" className="text-primary font-semibold underline">
                  identity verification
                </Link>{" "}
                has been approved. Your points keep accruing while a submission is under review —
                nothing is lost, they simply can&apos;t be withdrawn until you are verified.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">If verification is rejected</h2>
              <p className="m-0">
                If a submission is rejected, you will see the reason on your KYC page and can
                submit again with corrected details or clearer photos. Withdrawals stay locked
                until a submission is approved.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Payout methods</h2>
              <p className="m-0">
                You can be paid to JazzCash, Easypaisa, or a bank account (IBAN). Payouts must go
                to an account registered in your own name. Submitting someone else&apos;s account
                may result in a rejected or reversed payout and possible account action.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Processing time</h2>
              <p className="m-0">
                Withdrawal requests are processed within 2 working days of being submitted. You
                can follow the status of each request under Rewards, where it moves from Pending to
                Approved and then Paid.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl m-0">Request limits</h2>
              <p className="m-0">
                As a standard anti-fraud safeguard, withdrawal requests are limited to{" "}
                {WITHDRAWAL_REQUESTS_PER_HOUR} per hour per account. This won&apos;t affect normal
                use; if you hit the limit, try again later.
              </p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

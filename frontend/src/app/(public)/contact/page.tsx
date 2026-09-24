import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import ContactForm from "@/components/ContactForm";
import InfoPageNav from "@/components/InfoPageNav";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Contact — Digitize Pakistan";
const DESCRIPTION =
  "Get in touch with Digitize Online SMC (Private) Limited, the operator of Digitize Pakistan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <PublicHeader />

      <div className="max-w-[1360px] mx-auto px-4 md:px-12 py-10 md:py-14 w-full flex-1 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-10 md:gap-16">
        <InfoPageNav active="/contact" />

        <div className="flex flex-col gap-9 max-w-[900px]">
          <BackLink />
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">CONTACT</span>
            <h1 className="font-display text-5xl md:text-6xl leading-none m-0">
              We read every message.
            </h1>
            <p className="text-lg text-graphite leading-[1.5] m-0">
              Questions about payouts, verification or partnerships — we usually reply within one
              working day.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-7">
            <div className="bg-white border border-border rounded-[20px] p-6 md:p-7">
              <ContactForm />
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="bg-ink text-white rounded-[20px] p-[22px] flex flex-col gap-3.5">
                <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
                  REGISTERED OFFICE
                </span>
                <span className="text-[15px] leading-[1.55]">
                  Digitize Online SMC (Private) Limited
                  <br />
                  Karachi, Sindh, Pakistan
                </span>
                <span className="font-mono text-[13px] text-[#C9CFDC]">
                  support@digitize.com.pk
                </span>
              </div>
              <div className="bg-white border border-border rounded-[20px] p-[22px] flex flex-col gap-2">
                <span className="font-mono text-[11px] tracking-[.12em] text-muted">HOURS</span>
                <span className="text-[15px]">Mon–Fri · 10:00–18:00 PKT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import ContactForm from "@/components/ContactForm";
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

      <div className="max-w-2xl mx-auto px-4 md:px-0 pt-10 pb-16 w-full flex-1">
        <BackLink />

        <h1 className="font-display text-4xl mt-4 mb-2">Contact us</h1>
        <p className="text-sm text-muted mb-8">
          Digitize Online SMC (Private) Limited · Karachi, Pakistan
        </p>

        <div className="bg-paper-raised border border-border-strong rounded-[10px] p-6 max-w-lg">
          <ContactForm />
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

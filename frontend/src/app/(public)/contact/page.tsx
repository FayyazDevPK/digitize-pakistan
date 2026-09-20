import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";
import ContactForm from "@/components/ContactForm";

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

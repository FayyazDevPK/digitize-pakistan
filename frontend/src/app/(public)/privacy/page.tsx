export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 px-4 pb-16">
      <h1 className="font-display text-4xl mb-2">Privacy Policy</h1>
      <p className="font-mono text-[11px] text-muted mb-8">Last updated: September 2026</p>

      <div className="prose text-sm text-ink/90 leading-relaxed space-y-5">
        <section>
          <h2 className="font-display text-xl mb-2">Who we are</h2>
          <p>
            Digitize Pakistan is operated by Digitize Online SMC (Private) Limited, based in
            Karachi, Pakistan.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">Information we collect</h2>
          <p>
            We collect account information you provide (username, email), activity data (reading
            history, learning-path progress, referrals), and KYC documents when you submit them
            for reward withdrawal eligibility. KYC documents are used solely for identity
            verification and fraud prevention.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">Cookies and advertising</h2>
          <p>
            We use cookies to keep you logged in and to remember your preferences. We work with
            third-party advertising partners, including Google AdSense, who may use cookies to
            serve ads based on your visits to this and other sites. You can control ad
            personalization through{" "}
            <a
              href="https://adssettings.google.com"
              className="text-vermilion underline"
              target="_blank"
              rel="noreferrer"
            >
              Google&apos;s Ads Settings
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">How we use your information</h2>
          <p>
            We use your information to operate the platform, calculate and pay rewards, prevent
            fraud, and improve the service. We do not sell your personal information to third
            parties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">Your choices</h2>
          <p>
            You can update your profile information in Settings, and request account deletion by
            contacting us. KYC documents are retained only as long as required for compliance
            purposes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">Contact</h2>
          <p>
            For privacy questions, contact Digitize Online SMC (Private) Limited via the details
            listed on our platform overview page.
          </p>
        </section>
      </div>
    </div>
  );
}

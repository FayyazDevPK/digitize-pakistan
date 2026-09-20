"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "dp_ad_consent";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(CONSENT_KEY);
    if (!existing) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-ink text-paper px-4 py-3 z-50">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3 justify-between">
        <p className="text-xs text-paper/90">
          We use cookies to run this site and to show relevant ads, including from Google
          AdSense. See our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="font-mono text-[11px] border border-paper/40 rounded-sm px-3 py-1.5 hover:bg-paper/10 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="font-mono text-[11px] bg-vermilion rounded-sm px-3 py-1.5 hover:bg-vermilion-deep transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

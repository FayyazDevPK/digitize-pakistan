"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSenseUnit({
  adClient,
  adSlot,
  className,
}: {
  adClient: string;
  adSlot: string;
  className?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    // The AdSense script itself is only loaded in production (see root layout) — pushing to
    // adsbygoogle without it present would throw, and dev traffic must never hit AdSense anyway.
    if (process.env.NODE_ENV !== "production" || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not yet approved/loaded for this client — fail silently, not a broken page.
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle block${className ? ` ${className}` : ""}`}
      style={{ display: "block" }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

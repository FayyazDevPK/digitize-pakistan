"use client";

import { useEffect, useState } from "react";

// Visual scroll indicator only — unrelated to the read-to-earn reward mechanism.
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    function update() {
      const el = document.getElementById(targetId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const raw = total > 0 ? scrolled / total : window.scrollY > 0 ? 1 : 0;
      setPct(Math.min(100, Math.max(0, Math.round(raw * 100))));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="sticky top-0 z-40 h-[3px] bg-border"
    >
      <div className="h-[3px] bg-primary transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}

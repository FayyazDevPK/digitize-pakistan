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
      const top = rect.top + window.scrollY;
      // A "reading line" at mid-screen travels from the article's top edge to its bottom edge.
      const line = window.scrollY + window.innerHeight * 0.5;
      const atPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      const raw = atPageEnd && line >= top ? 1 : (line - top) / rect.height;
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
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-[#D4D3CA]/60"
    >
      <div
        className="h-1 bg-primary transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

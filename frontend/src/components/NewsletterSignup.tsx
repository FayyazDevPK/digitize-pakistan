"use client";

import { useState } from "react";

// Frontend-only, matching the ContactForm pattern: there's no newsletter
// backend endpoint yet, so this just gives local confirmation rather than
// inventing one.
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  }

  if (subscribed) {
    return (
      <div className="text-[13px] text-primary-light font-semibold mt-0.5">
        ✓ You&apos;re on the list.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-0.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Weekly AI digest — email"
        className="flex-1 h-10 rounded-[10px] bg-ink border border-[#24304A] px-3 text-[13px] text-white placeholder:text-[#6E7890] outline-none focus:border-primary-light"
      />
      <button
        type="submit"
        className="h-10 rounded-[10px] bg-primary-light text-ink text-[13px] font-bold px-3.5 shrink-0"
      >
        Subscribe
      </button>
    </form>
  );
}

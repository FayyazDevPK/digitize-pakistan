"use client";

import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import BackLink from "@/components/BackLink";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

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
          {sent ? (
            <div className="flex flex-col gap-1.5">
              <span className="font-display text-xl">Message sent</span>
              <p className="text-sm text-muted">
                Thanks for reaching out — we&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase text-muted">Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase text-muted">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase text-muted">Message</span>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion transition-colors"
                />
              </div>
              <button
                type="submit"
                className="self-start bg-vermilion text-white text-sm font-semibold rounded-[7px] px-4 py-2.5 hover:bg-vermilion-deep transition-colors"
              >
                Send message
              </button>
            </form>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

"use client";

import { useState } from "react";

const TOPICS = ["Payouts", "KYC", "Creator program", "Partnerships", "Other"];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-display text-2xl">Message sent</span>
        <p className="text-sm text-muted">
          Thanks for reaching out — we&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Topic</span>
        <div className="flex gap-2 flex-wrap text-[13px] font-medium">
          {TOPICS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTopic(t)}
              className={
                t === topic
                  ? "bg-ink text-white px-3.5 py-2.5 rounded-[9px]"
                  : "border border-border-strong px-3 py-2 rounded-[9px]"
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Message</span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border border-border-strong rounded-[11px] px-3.5 py-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-[#8A8F9C]">
          Never include your full CNIC or passwords.
        </span>
        <button
          type="submit"
          className="bg-primary text-white font-semibold text-[15px] px-5 py-3 rounded-xl"
        >
          Send message
        </button>
      </div>
    </form>
  );
}

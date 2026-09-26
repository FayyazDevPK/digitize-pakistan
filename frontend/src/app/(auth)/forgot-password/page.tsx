"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, apiErrorMessage } from "@/lib/api-client";
import AuthCard, { AUTH_INPUT } from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/password-reset/request/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter your account email and we'll send you a link to choose a new password."
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <div className="bg-mint text-primary-deep rounded-2xl p-4 text-sm leading-[1.5]">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. The link
            expires in 1 hour.
          </div>
          <Link href="/login" className="text-primary font-semibold text-sm">
            ← Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT}
            />
          </div>
          {error && <p className="text-alert text-sm m-0">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="h-[50px] bg-primary text-white font-semibold text-base rounded-xl disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
          <Link href="/login" className="text-primary font-semibold text-sm">
            ← Back to log in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}

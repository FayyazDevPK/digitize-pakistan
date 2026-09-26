"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, apiErrorMessage } from "@/lib/api-client";
import AuthCard, { AUTH_INPUT } from "@/components/AuthCard";
import PasswordStrength from "@/components/PasswordStrength";

function ResetForm() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!uid || !token) {
    return (
      <AuthCard title="Link not valid" subtitle="This reset link is incomplete.">
        <Link href="/forgot-password" className="text-primary font-semibold text-sm">
          Request a new reset link
        </Link>
      </AuthCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="You've been signed out everywhere. Log in with your new password.">
        <Link
          href="/login"
          className="h-[50px] flex items-center justify-center bg-primary text-white font-semibold text-base rounded-xl"
        >
          Log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">New password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_INPUT}
          />
          <PasswordStrength password={password} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Confirm new password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={AUTH_INPUT}
          />
        </div>
        {error && (
          <p className="text-alert text-sm m-0">
            {error}{" "}
            {/invalid|expired/i.test(error) && (
              <Link href="/forgot-password" className="underline font-semibold">
                Request a new link
              </Link>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-[50px] bg-primary text-white font-semibold text-base rounded-xl disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-10 font-mono text-sm text-muted">Loading...</p>}>
      <ResetForm />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, apiErrorMessage } from "@/lib/api-client";
import AuthCard from "@/components/AuthCard";

function Verify() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");
  const [state, setState] = useState<"working" | "ok" | "error">(uid && token ? "working" : "error");
  const [message, setMessage] = useState(uid && token ? "" : "This verification link is incomplete.");
  const started = useRef(false);

  useEffect(() => {
    if (!uid || !token || started.current) return;
    started.current = true; // tokens are single-use; don't fire twice under StrictMode
    apiFetch("/api/verify-email/", { method: "POST", body: JSON.stringify({ uid, token }) })
      .then(() => setState("ok"))
      .catch((err) => {
        setMessage(apiErrorMessage(err));
        setState("error");
      });
  }, [uid, token]);

  if (state === "working") {
    return <AuthCard title="Verifying…" subtitle="Confirming your email address.">
        <span />
      </AuthCard>;
  }
  if (state === "ok") {
    return (
      <AuthCard title="Email verified" subtitle="Thanks — your email address is confirmed.">
        <Link
          href="/dashboard"
          className="h-[50px] flex items-center justify-center bg-primary text-white font-semibold text-base rounded-xl"
        >
          Go to Dashboard
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Couldn't verify" subtitle={message}>
      <p className="text-sm text-muted m-0">
        Log in and use &ldquo;Resend verification email&rdquo; on your Dashboard to get a fresh link.
      </p>
      <Link href="/login" className="text-primary font-semibold text-sm">
        Log in
      </Link>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="p-10 font-mono text-sm text-muted">Loading...</p>}>
      <Verify />
    </Suspense>
  );
}

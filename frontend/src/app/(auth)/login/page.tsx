"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";
import { storeTokens, fetchCurrentUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        router.replace("/dashboard");
        return;
      }
      setCheckingAuth(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await login(username, password);
      storeTokens(data.access, data.refresh);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[500px] bg-paper-raised border border-border-strong rounded-[10px] overflow-hidden flex flex-col">
        <div className="bg-ink px-7 py-[26px] flex flex-col gap-[9px]">
          <svg width="30" height="30" viewBox="0 0 46 46">
            <rect width="46" height="46" rx="9" fill="#FAF7F2" />
            <rect x="11" y="13" width="4" height="20" fill="#12151C" />
            <path d="M19 13h6a10 10 0 0 1 0 20h-6z" fill="none" stroke="#12151C" strokeWidth="4" />
            <circle cx="33.5" cy="33.5" r="3.5" fill="#E0512B" />
          </svg>
          <div className="font-display text-[27px] text-paper leading-[1.15]">Welcome back</div>
          <span className="text-[13.5px] text-[#C9CCD2]">Log in to keep reading and earning.</span>
        </div>

        <div className="px-7 pt-6 pb-7 flex flex-col gap-4">
          <div className="flex bg-[#EDE9E1] rounded-[7px] p-[3px]">
            <Link
              href="/register"
              className="flex-1 text-center text-[13.5px] text-muted py-2"
            >
              Register
            </Link>
            <span className="flex-1 text-center text-[13.5px] font-semibold bg-white py-2 rounded-[5px] border border-border">
              Log in
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Username</span>
              <input
                className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm text-ink outline-none focus:border-vermilion transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Password</span>
              <input
                type="password"
                className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm text-ink outline-none focus:border-vermilion transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-alert text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-vermilion text-white text-sm font-semibold py-[13px] rounded-[7px] text-center hover:bg-vermilion-deep transition-colors disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10.5px] text-[#8A8F9B]">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <span className="border border-border-strong bg-white text-[13.5px] font-medium py-3 rounded-[7px] text-center">
            Continue with Google
          </span>

          <span className="text-[11.5px] text-muted leading-[1.55] text-center">
            New here?{" "}
            <Link href="/register" className="text-vermilion-deep font-medium">
              Create a free account
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

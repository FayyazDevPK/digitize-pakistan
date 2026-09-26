"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, login } from "@/lib/api-client";
import { storeTokens, fetchCurrentUser } from "@/lib/auth";
import PixelD from "@/components/PixelD";

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
      setError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect username or password."
          : err instanceof ApiError && err.status === 429
            ? "Too many attempts. Please try again in a minute."
            : "Login failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex bg-ink text-white flex-col justify-between p-16">
        <Link href="/news" className="flex items-center gap-2.5">
          <PixelD size={8} onDark />
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="font-extrabold text-xl">Digitize</span>
            <span className="font-display italic text-2xl text-[#C9CFDC]">Pakistan</span>
          </div>
        </Link>
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-6xl xl:text-7xl leading-[.95] m-0">
            Welcome back.
            <br />
            <span className="italic text-marigold">Your points missed you.</span>
          </h1>
          <div className="flex gap-7 mt-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xl font-semibold">1,000 pts</span>
              <span className="text-[13px] text-muted-2">= Rs 250, withdrawable</span>
            </div>
            <div className="w-px bg-[#24304A]" />
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xl font-semibold">KYC</span>
              <span className="text-[13px] text-muted-2">SBP-aligned verification</span>
            </div>
          </div>
        </div>
        <span className="text-xs text-[#6E7890]">
          © {new Date().getFullYear()} Digitize Online SMC (Private) Limited
        </span>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[420px] flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-4xl md:text-[44px] m-0">Log in</h2>
            <span className="text-[15px] text-muted">
              New here?{" "}
              <Link href="/register" className="text-primary font-semibold">
                Create an account
              </Link>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Username</span>
              <input
                className="h-12 bg-white border border-border-strong rounded-[11px] px-3.5 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-mint transition-shadow"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-semibold">Password</span>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="h-12 bg-white border border-border-strong rounded-[11px] px-3.5 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-mint transition-shadow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-alert text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="h-[50px] bg-primary text-white font-semibold text-base rounded-xl disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-[#8A8F9C]">
            <div className="flex-1 h-px bg-border" />
            or
            <div className="flex-1 h-px bg-border" />
          </div>

          <span className="h-[50px] flex items-center justify-center bg-white border border-border-strong rounded-xl font-semibold text-[15px]">
            Continue with Google
          </span>
        </div>
      </div>
    </div>
  );
}

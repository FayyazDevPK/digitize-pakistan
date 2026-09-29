"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiErrorMessage, login } from "@/lib/api-client";
import { storeTokens, fetchCurrentUser } from "@/lib/auth";
import PixelD from "@/components/PixelD";
import PasswordStrength from "@/components/PasswordStrength";

const STEPS = [
  { n: "01", label: "Create your account & verify your email", pts: "+100 pts" },
  { n: "02", label: "Read articles and finish learning paths", pts: "+20–500" },
  { n: "03", label: "Verify your CNIC and withdraw", pts: "Rs 250 / 1k" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
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
      await apiFetch("/api/register/", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
          referral_code: referralCode || undefined,
        }),
      });
      const data = await login(username, password);
      storeTokens(data.access, data.refresh);
      router.push("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Registration failed."));
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
        <div className="flex flex-col gap-7">
          <h1 className="font-display text-6xl xl:text-7xl leading-[.95] m-0">
            Read. Learn.
            <br />
            <span className="italic text-marigold">Get paid.</span>
          </h1>
          <div className="flex flex-col">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`grid grid-cols-[40px_1fr_auto] gap-3 py-4 items-center border-t border-[#24304A] ${
                  i === STEPS.length - 1 ? "border-b" : ""
                }`}
              >
                <span className="font-mono text-xs text-[#6E7890]">{s.n}</span>
                <span className="text-base">{s.label}</span>
                <span
                  className={`font-mono text-[13px] font-semibold ${
                    i === 0 ? "text-marigold" : i === 1 ? "text-primary-light" : "text-white"
                  }`}
                >
                  {s.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
        <span className="text-xs text-[#6E7890]">
          © {new Date().getFullYear()} Digitize Online SMC (Private) Limited
        </span>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[440px] flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-4xl md:text-[44px] m-0">Create your account</h2>
            <span className="text-[15px] text-muted">
              Already a member?{" "}
              <Link href="/login" className="text-primary font-semibold">
                Log in
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
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Email</span>
              <input
                type="email"
                className="h-12 bg-white border border-border-strong rounded-[11px] px-3.5 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-mint transition-shadow"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Password</span>
              <input
                type="password"
                className="h-12 bg-white border border-border-strong rounded-[11px] px-3.5 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-mint transition-shadow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
              <PasswordStrength password={password} />
            </div>
            <div className="flex flex-col gap-1.5 bg-white border border-dashed border-border-strong rounded-2xl p-3.5">
              <span className="text-[13px] font-semibold">
                Referral code <span className="font-normal text-[#8A8F9C]">— optional</span>
              </span>
              <input
                className="h-11 border border-border-strong rounded-[10px] px-3 font-mono text-sm outline-none focus:border-primary"
                placeholder="e.g. AYESHA-7K2"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
              <span className="text-xs text-muted">
                Got a code from a friend? They earn a bonus once you verify your email and finish
                a lesson — you&apos;ll earn your own +100 pts for verifying your email either way.
              </span>
            </div>

            {error && <p className="text-alert text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="h-[50px] bg-primary text-white font-semibold text-base rounded-xl disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account & verify to earn 100 pts"}
            </button>
          </form>

          <span className="text-xs text-[#8A8F9C] leading-[1.5]">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-primary font-medium">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary font-medium">
              Privacy Policy
            </Link>
            .
          </span>
        </div>
      </div>
    </div>
  );
}

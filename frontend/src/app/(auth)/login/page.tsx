"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";
import { storeTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await login(username, password);
      storeTokens(data.access, data.refresh);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-[20%] bg-ink flex items-center justify-center relative shrink-0">
            <span className="text-paper font-display text-lg">D</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-vermilion" />
          </div>
          <span className="font-display text-2xl">Digitize Pakistan</span>
        </div>

        <div className="bg-paper-raised border border-border rounded-md p-8">
          <h1 className="font-display text-2xl mb-6">Log in</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[11px] uppercase text-muted mb-1.5">
                Username
              </label>
              <input
                className="w-full border border-border-strong rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-vermilion transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="w-full border border-border-strong rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-vermilion transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="mt-2 bg-ink text-paper font-medium text-sm rounded-sm py-2.5 hover:bg-vermilion-deep transition-colors"
            >
              Log in
            </button>
          </form>
          {error && <p className="mt-4 text-alert text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}

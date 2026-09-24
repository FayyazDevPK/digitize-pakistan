"use client";

const SEGMENT_COLORS = ["", "bg-rose", "bg-marigold", "bg-primary", "bg-primary"];

export function scorePassword(pw: string): { score: number; tip: string } {
  if (!pw) return { score: 0, tip: "" };
  if (pw.length < 8) return { score: 1, tip: "Too short — use at least 8 characters." };

  const hasMixedCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const long = pw.length >= 12;

  const score = 1 + Number(hasMixedCase) + Number(hasDigit) + Number(hasSymbol || long);
  const capped = Math.min(score, 4);

  if (capped === 4) return { score: 4, tip: "Strong." };
  if (!hasMixedCase) return { score: capped, tip: "Mix upper and lower case letters." };
  if (!hasDigit) return { score: capped, tip: "Add a number." };
  return { score: capped, tip: "Add a symbol or make it longer to make it strong." };
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export default function PasswordStrength({ password }: { password: string }) {
  const { score, tip } = scorePassword(password);
  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-0.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-label="Password strength">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-sm ${i <= score ? SEGMENT_COLORS[score] : "bg-border"}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted">
        <span className="font-semibold">{LABELS[score]}</span> — {tip}
      </span>
    </div>
  );
}

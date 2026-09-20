"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BackLink({
  label = "Back",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center font-mono text-[11px] uppercase text-muted hover:text-ink transition-colors"
      }
    >
      ← {label}
    </Link>
  );
}

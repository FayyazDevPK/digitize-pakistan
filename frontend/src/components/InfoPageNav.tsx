import Link from "next/link";

const LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Payout Policy", href: "/payout-policy" },
];

export default function InfoPageNav({ active }: { active: string }) {
  return (
    <nav className="hidden md:flex flex-col gap-1 pt-2">
      <span className="font-mono text-[11px] tracking-[.12em] text-muted px-3 pb-3">COMPANY</span>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            l.href === active
              ? "text-[15px] font-semibold px-3 py-2.5 bg-white border border-border rounded-[10px]"
              : "text-[15px] text-muted px-3 py-2.5"
          }
        >
          {l.label}
        </Link>
      ))}
      <span className="text-xs text-[#8A8F9C] leading-[1.5] px-3 pt-5">
        Legal pages use this template with a &quot;Last updated&quot; stamp and numbered
        sections.
      </span>
    </nav>
  );
}

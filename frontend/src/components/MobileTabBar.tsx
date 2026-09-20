"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "News", icon: "📰", href: "/news" },
  { label: "Tools", icon: "🧰", href: "/tools" },
  { label: "Learn", icon: "🎓", href: "/my-learning" },
  { label: "Earn", icon: "💰", href: "/rewards" },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border px-3 py-2.5 flex justify-around z-10">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className="flex flex-col items-center gap-1 min-w-[56px] min-h-[44px] justify-center"
          >
            <span className={active ? "text-[17px]" : "text-[17px] opacity-50"}>{tab.icon}</span>
            <span
              className={
                active
                  ? "text-[10.5px] font-semibold text-vermilion"
                  : "text-[10.5px] text-muted"
              }
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

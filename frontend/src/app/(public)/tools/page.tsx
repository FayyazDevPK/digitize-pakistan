import Link from "next/link";
import type { Metadata } from "next";
import { getContentList } from "@/lib/content";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { SITE_NAME } from "@/lib/site";

const TITLE = "AI Tool Directory — Digitize Pakistan";
const DESCRIPTION =
  "A curated directory of AI tools reviewed for Pakistani users — writing, speech, documents, dev, and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: "/tools",
  },
};

export default async function ToolsPage() {
  const items = await getContentList("TOOL_LISTING");
  const featured = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="AI Tools" />

      <div className="max-w-[1280px] mx-auto p-4 md:p-7 flex flex-col gap-[22px]">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-3xl md:text-[38px]">AI tool directory</h1>
            <span className="text-sm text-muted">{items.length} tools listed</span>
          </div>
        </div>

        {items.length === 0 && <p className="font-mono text-sm text-muted">No tools listed yet.</p>}

        {featured.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`bg-white rounded-[10px] p-[18px] flex flex-col gap-2.5 border ${
                  tool.visibility === "PREMIUM_ONLY" ? "border-[#E3D3A8]" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-[9px] bg-[#E7E2D9]" />
                  <span
                    className={`text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded ${
                      tool.visibility === "PREMIUM_ONLY"
                        ? "bg-premium text-white"
                        : "border border-[#9AA0AC] text-[#4E5463]"
                    }`}
                  >
                    {tool.visibility === "PREMIUM_ONLY" ? "★ PREMIUM" : "FREE"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[16px] font-semibold">{tool.title}</span>
                  <span className="text-[13px] text-muted leading-[1.5]">{tool.excerpt}</span>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-[11px] text-muted pt-[3px] border-t border-[#F0EDE7]">
                  <span>{tool.category?.name?.toUpperCase()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="font-mono text-[11px] font-semibold tracking-[.16em] border-b-2 border-ink pb-[7px]">
              ALL TOOLS
            </div>
            {rest.map((tool, i) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`flex items-center gap-3.5 py-3 ${
                  i < rest.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="w-[34px] h-[34px] rounded-lg bg-[#E7E2D9] shrink-0" />
                <span className="text-[14.5px] font-semibold w-[170px] shrink-0 truncate">
                  {tool.title}
                </span>
                <span className="text-[13px] text-muted flex-1 min-w-0 truncate">
                  {tool.excerpt}
                </span>
                <span
                  className={`text-[10px] font-semibold px-[7px] py-[3px] rounded shrink-0 ${
                    tool.visibility === "PREMIUM_ONLY"
                      ? "bg-premium text-white"
                      : "border border-[#9AA0AC] text-[#4E5463]"
                  }`}
                >
                  {tool.visibility === "PREMIUM_ONLY" ? "★ PREMIUM" : "FREE"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}

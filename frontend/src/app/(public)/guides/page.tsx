import { getContentList } from "@/lib/content";

export default async function GuidesPage() {
  const items = await getContentList("GUIDE");

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4 pb-16">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase text-muted mb-1">
          Digitize Pakistan
        </div>
        <h1 className="font-display text-4xl">Guides</h1>
      </div>

      {items.length === 0 && (
        <p className="font-mono text-sm text-muted">No guides yet.</p>
      )}

      <div className="border-t border-border-strong">
        {items.map((item) => (
          <article key={item.id} className="py-5 border-b border-border">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] uppercase text-muted tracking-wide">
                {item.category?.name ?? "Guide"}
              </span>
              {item.visibility === "PREMIUM_ONLY" && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-premium text-white">
                  ★ PREMIUM
                </span>
              )}
            </div>
            <h2 className="font-display text-xl leading-snug mb-1.5">{item.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{item.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

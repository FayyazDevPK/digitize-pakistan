import { getContentList } from "@/lib/content";

export default async function GuidesPage() {
  const items = await getContentList("GUIDE");

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Guides</h1>
      {items.length === 0 && <p>No guides yet.</p>}
      {items.map((item) => (
        <article
          key={item.id}
          style={{ marginBottom: 24, borderBottom: "1px solid #ddd", paddingBottom: 16 }}
        >
          <h2>
            {item.title}
            {item.visibility === "PREMIUM_ONLY" && (
              <span style={{ fontSize: 12, marginLeft: 8, color: "#b8860b" }}>★ PREMIUM</span>
            )}
          </h2>
          <p>{item.excerpt}</p>
        </article>
      ))}
    </div>
  );
}

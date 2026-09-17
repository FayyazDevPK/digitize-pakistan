import { getContentList } from "@/lib/content";

export default async function NewsPage() {
  const items = await getContentList("NEWS");

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>News</h1>
      {items.length === 0 && <p>No news yet.</p>}
      {items.map((item) => (
        <article
          key={item.id}
          style={{ marginBottom: 24, borderBottom: "1px solid #ddd", paddingBottom: 16 }}
        >
          <h2>{item.title}</h2>
          <p>{item.excerpt}</p>
        </article>
      ))}
    </div>
  );
}

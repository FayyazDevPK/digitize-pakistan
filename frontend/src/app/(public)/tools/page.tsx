import { getContentList } from "@/lib/content";

export default async function ToolsPage() {
  const items = await getContentList("TOOL_LISTING");

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>AI Tool Directory</h1>
      {items.length === 0 && <p>No tools listed yet.</p>}
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

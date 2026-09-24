export interface ContentItem {
  id: number;
  type: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  category: { id: number; name: string; slug: string; parent: number | null };
  tags: string[];
  visibility: string;
  published_at: string | null;
  view_count: number;
  author_name: string;
}

export type ContentSort = "newest" | "alphabetical" | "popular";

export async function getContentList(
  type?: string,
  opts: { category?: string; sort?: ContentSort } = {}
): Promise<ContentItem[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (opts.category) qs.set("category", opts.category);
  if (opts.sort) qs.set("sort", opts.sort);
  const query = qs.toString();
  const res = await fetch(`${API_URL}/api/content/${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getContentCategories(
  type?: string
): Promise<{ id: number; name: string; slug: string }[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(
    `${API_URL}/api/content/categories/${type ? `?type=${type}` : ""}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

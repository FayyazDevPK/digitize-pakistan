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
}

export async function getContentList(type?: string): Promise<ContentItem[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const url = type ? `${API_URL}/api/content/?type=${type}` : `${API_URL}/api/content/`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

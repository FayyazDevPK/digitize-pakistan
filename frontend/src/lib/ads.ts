export interface AdSlotData {
  id: number;
  placement: string;
  slot_type: string;
  ad_client: string;
  ad_slot_id: string;
  advertiser_name: string;
  image_url: string;
  target_url: string;
}

// A slot only renders once it actually has the fields its type needs —
// a DIRECT row with no image/link, or an ADSENSE row with no client/slot id,
// is treated as not configured yet rather than shown broken.
export async function getAd(placement: string): Promise<AdSlotData | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/api/ads/?placement=${placement}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as AdSlotData[];
  const slot = data.find(
    (s) =>
      (s.slot_type === "DIRECT" && s.image_url && s.target_url) ||
      (s.slot_type === "ADSENSE" && s.ad_client && s.ad_slot_id)
  );
  return slot ?? null;
}

"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ReferralEntry {
  status: string;
  created_at: string;
}

export default function ReferralGrowthChart({ referrals }: { referrals: ReferralEntry[] }) {
  if (referrals.length === 0) {
    return (
      <div className="flex flex-col gap-2 py-6 items-center text-center">
        <span className="font-mono text-xs text-muted-2">NOBODY YET</span>
        <span className="text-sm text-muted">Referrals appear here month by month once people join.</span>
      </div>
    );
  }

  const byMonth = new Map<string, { PENDING: number; QUALIFIED: number; REWARDED: number }>();
  for (const r of referrals) {
    const key = new Date(r.created_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    if (!byMonth.has(key)) byMonth.set(key, { PENDING: 0, QUALIFIED: 0, REWARDED: 0 });
    const bucket = byMonth.get(key)!;
    if (r.status === "PENDING") bucket.PENDING += 1;
    else if (r.status === "QUALIFIED") bucket.QUALIFIED += 1;
    else if (r.status === "REWARDED") bucket.REWARDED += 1;
  }

  const data = Array.from(byMonth.entries()).map(([month, counts]) => ({ month, ...counts }));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EFEEE8" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#8A8F9C", fontFamily: "JetBrains Mono" }}
          axisLine={{ stroke: "#D4D3CA" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#8A8F9C", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #E3E2DA",
            fontSize: 12,
            fontFamily: "JetBrains Mono",
          }}
        />
        <Bar dataKey="REWARDED" stackId="a" fill="#5A5BD5" radius={[4, 4, 0, 0]} name="Rewarded" />
        <Bar dataKey="QUALIFIED" stackId="a" fill="#9D9EEA" name="Qualified" />
        <Bar dataKey="PENDING" stackId="a" fill="#F2B233" radius={[4, 4, 0, 0]} name="Pending" />
      </BarChart>
    </ResponsiveContainer>
  );
}

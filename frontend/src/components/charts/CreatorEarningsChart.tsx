"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface LedgerEntry {
  type: string;
  amount: string;
  created_at: string;
}

export default function CreatorEarningsChart({ entries }: { entries: LedgerEntry[] }) {
  const bounties = entries
    .filter((e) => e.type === "CREATOR_BOUNTY")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (bounties.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-3.5 h-[150px] px-2 border-b border-border-strong">
          {[18, 30, 22, 44, 36, 60].map((h, i) => (
            <div
              key={i}
              className={
                i === 5
                  ? "flex-1 border-[1.5px] border-marigold bg-[#FFF8E6] border-b-0 rounded-t-[5px] flex items-start justify-center pt-2 font-mono text-[11px] font-semibold text-premium"
                  : "flex-1 border-[1.5px] border-dashed border-border border-b-0 rounded-t-[5px]"
              }
              style={{ height: `${h}%` }}
            >
              {i === 5 ? "You?" : ""}
            </div>
          ))}
        </div>
        <span className="text-sm text-graphite leading-[1.45]">
          Bars appear when editors pay a bounty on your published work.
        </span>
      </div>
    );
  }

  const data = bounties.reduce<{ date: string; bounty: number; cumulative: number }[]>(
    (acc, e) => {
      const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({
        date: new Date(e.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        bounty: Number(e.amount),
        cumulative: prevCumulative + Number(e.amount),
      });
      return acc;
    },
    []
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EFEEE8" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#8A8F9C", fontFamily: "JetBrains Mono" }}
          axisLine={{ stroke: "#D4D3CA" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#8A8F9C", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #E3E2DA",
            fontSize: 12,
            fontFamily: "JetBrains Mono",
          }}
        />
        <Bar dataKey="bounty" fill="#F2B233" radius={[4, 4, 0, 0]} name="Bounty paid" barSize={28} />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke="#0B1426"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#FFFFFF", stroke: "#0B1426", strokeWidth: 2 }}
          name="Cumulative"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

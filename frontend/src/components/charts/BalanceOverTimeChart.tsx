"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface LedgerEntry {
  id: number;
  type: string;
  amount: string;
  balance_after: string;
  created_at: string;
}

export default function BalanceOverTimeChart({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="relative h-[230px] flex items-center justify-center">
        <svg viewBox="0 0 800 230" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <line x1="0" x2="800" y1="200" y2="200" stroke="#D4D3CA" />
          <path
            d="M0,200 C160,196 260,180 380,160 S620,110 800,70"
            fill="none"
            stroke="#1FBF84"
            strokeWidth="2"
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
          <circle cx="0" cy="200" r="6" fill="#F2B233" stroke="#0B1426" strokeWidth="2" />
        </svg>
        <div className="relative bg-white border border-border rounded-2xl px-5 py-4 flex flex-col gap-2 items-center text-center shadow-sm w-[320px]">
          <span className="font-display text-xl leading-[1.1]">
            Your line starts with one article.
          </span>
          <span className="text-[13px] text-muted">
            Every point you earn is plotted here — withdrawals too.
          </span>
        </div>
      </div>
    );
  }

  // recent_entries come back newest-first; plot chronologically.
  const data = [...entries]
    .reverse()
    .map((e) => ({
      date: new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      balance: Number(e.balance_after),
      isWithdrawal: Number(e.amount) < 0,
    }));

  // A single point has no line to draw (Area/Line need >= 2 points for a path) and the custom
  // dot renderer below only draws a marker for withdrawals -- together that meant one real,
  // non-withdrawal ledger entry rendered as a totally blank chart. Force a visible dot then.
  const singlePoint = data.length === 1;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1FBF84" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#1FBF84" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          width={44}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #E3E2DA",
            fontSize: 12,
            fontFamily: "JetBrains Mono",
          }}
          formatter={(value) => [`${Number(value).toLocaleString()} pts`, "Balance"]}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#087A54"
          strokeWidth={2.5}
          fill="url(#balanceFill)"
          dot={
            singlePoint
              ? { r: 5, fill: "#087A54", stroke: "#FFFFFF", strokeWidth: 2 }
              : (props: { cx?: number; cy?: number; payload?: { isWithdrawal?: boolean } }) => {
                  const { cx, cy, payload } = props;
                  if (!payload?.isWithdrawal || cx === undefined || cy === undefined) {
                    return <g key={`dot-${cx}-${cy}`} />;
                  }
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#FFFFFF"
                      stroke="#D6453D"
                      strokeWidth={2.5}
                    />
                  );
                }
          }
          activeDot={{ r: 5, fill: "#F2B233", stroke: "#0B1426", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

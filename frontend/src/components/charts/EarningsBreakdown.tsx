"use client";

import { ledgerStyle } from "@/lib/ledger";

interface LedgerEntry {
  type: string;
  amount: string;
}

const EARNING_TYPES = ["READ_ENGAGEMENT", "CREATOR_BOUNTY", "REFERRAL_BONUS"];
const OUTFLOW_TYPES = ["WITHDRAWAL", "ADJUSTMENT"];

export default function EarningsBreakdown({ entries }: { entries: LedgerEntry[] }) {
  const earningTotals = EARNING_TYPES.map((type) => ({
    type,
    total: entries
      .filter((e) => e.type === type && Number(e.amount) > 0)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  })).filter((t) => t.total > 0);

  const outflowTotals = OUTFLOW_TYPES.map((type) => ({
    type,
    total: entries
      .filter((e) => e.type === type)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  })).filter((t) => t.total !== 0);

  const grandTotal = earningTotals.reduce((sum, t) => sum + t.total, 0);

  if (grandTotal === 0) {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="h-[18px] rounded-md bg-[repeating-linear-gradient(90deg,#EFEEE8_0,#EFEEE8_8px,#F7F6F1_8px,#F7F6F1_16px)]" />
        <div className="flex flex-col">
          {["READ_ENGAGEMENT", "REFERRAL_BONUS", "CREATOR_BOUNTY"].map((type) => {
            const s = ledgerStyle(type);
            return (
              <div
                key={type}
                className="grid grid-cols-[12px_1fr_auto] gap-2.5 items-center py-3 border-t border-[#EFEEE8]"
              >
                <span
                  className="w-2.5 h-2.5 rounded-[3px]"
                  style={{ border: `2px solid ${s.dot}` }}
                />
                <span className="text-sm">{s.label}</span>
                <span className="font-mono text-xs" style={{ color: s.text }}>
                  earn to fill in
                </span>
              </div>
            );
          })}
        </div>
        <span className="text-xs text-muted">The breakdown fills in as you earn.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex h-[18px] rounded-md overflow-hidden gap-[2px]">
        {earningTotals.map((t) => {
          const s = ledgerStyle(t.type);
          return (
            <div
              key={t.type}
              style={{ width: `${(t.total / grandTotal) * 100}%`, background: s.dot }}
            />
          );
        })}
      </div>
      <div className="flex flex-col">
        {earningTotals.map((t) => {
          const s = ledgerStyle(t.type);
          const pct = ((t.total / grandTotal) * 100).toFixed(1);
          return (
            <div
              key={t.type}
              className="grid grid-cols-[12px_1fr_auto_52px] gap-2.5 items-center py-2.5 border-t border-[#EFEEE8]"
            >
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.dot }} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="font-mono text-[10px] text-muted-2">{t.type}</span>
              </div>
              <span className="font-mono text-sm font-semibold">
                {t.total.toLocaleString()}
              </span>
              <span className="font-mono text-xs text-muted text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
      {outflowTotals.length > 0 && (
        <div className="bg-paper rounded-2xl p-3.5 flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[.12em] text-muted">
            OUTFLOWS & CORRECTIONS · NOT EARNINGS
          </span>
          {outflowTotals.map((t) => {
            const s = ledgerStyle(t.type);
            return (
              <div key={t.type} className="flex justify-between text-[13px]">
                <span>
                  {s.label} <span className="font-mono text-[10px]" style={{ color: s.text }}>{t.type}</span>
                </span>
                <span className="font-mono font-semibold" style={{ color: s.text }}>
                  {t.total.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

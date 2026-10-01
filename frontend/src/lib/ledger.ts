// Ledger type colors and labels — shared across Dashboard, Rewards, and Creator Studio so
// every chart, tag, and activity row uses the same palette and the same readable name (never
// a raw type code like "SIGNUP_BONUS") for a given entry type.
export const LEDGER_TYPE_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  READ_ENGAGEMENT: { bg: "#DDF3E8", text: "#065C40", dot: "#1FBF84", label: "Read reward" },
  REFERRAL_BONUS: { bg: "#E7E7FB", text: "#3A3BA8", dot: "#5A5BD5", label: "Referral bonus" },
  CREATOR_BOUNTY: { bg: "#FCEFCC", text: "#7A5300", dot: "#F2B233", label: "Creator bounty" },
  SIGNUP_BONUS: { bg: "#E6F7F3", text: "#0B6E5C", dot: "#12B886", label: "Signup bonus" },
  WITHDRAWAL: { bg: "#FBE3E0", text: "#A12E27", dot: "#D6453D", label: "Withdrawal" },
  ADJUSTMENT: { bg: "#ECECE6", text: "#454B5C", dot: "#8A8F9C", label: "Adjustment" },
};

export function ledgerStyle(type: string) {
  return (
    LEDGER_TYPE_STYLE[type] ?? { bg: "#ECECE6", text: "#454B5C", dot: "#8A8F9C", label: type }
  );
}

// The single shared definition of "earnings": what actually counts toward Lifetime earned,
// the weekly-gain figures (Dashboard card + sidebar), and the "Where it came from" breakdown.
// ADJUSTMENT (admin credits AND withdrawal refunds are both recorded as ADJUSTMENT) and
// WITHDRAWAL are never earnings, even when their amount is positive -- only the running
// balance includes them.
export const EARNING_TYPES = new Set([
  "READ_ENGAGEMENT",
  "REFERRAL_BONUS",
  "CREATOR_BOUNTY",
  "SIGNUP_BONUS",
]);

export function isEarningEntry(type: string): boolean {
  return EARNING_TYPES.has(type);
}

// The single shared formatter for point amounts. API ledger fields (e.g. RewardsLedgerEntry
// .amount, WithdrawalRequest.points_requested) are DecimalFields, which DRF serializes as
// strings like "8000.00" -- rendering those directly, or calling .toLocaleString() on the
// string (a no-op, since that's a String method with no numeric formatting behavior), prints
// the raw decimal straight into the UI. This always converts to a number first, adds thousands
// separators, and only keeps decimal places when the value is genuinely fractional (ledger
// amounts are effectively always whole points, but this doesn't assume that).
export function formatPoints(value: number | string, options: { signed?: boolean } = {}): string {
  const n = Number(value);
  const formatted = n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return options.signed && n >= 0 ? `+${formatted}` : formatted;
}

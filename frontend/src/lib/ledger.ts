// Ledger type colors — shared across Dashboard, Rewards, and Creator Studio
// so every chart and tag uses the same palette for the same entry type.
export const LEDGER_TYPE_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  READ_ENGAGEMENT: { bg: "#DDF3E8", text: "#065C40", dot: "#1FBF84", label: "Reading & learning" },
  REFERRAL_BONUS: { bg: "#E7E7FB", text: "#3A3BA8", dot: "#5A5BD5", label: "Referral bonuses" },
  CREATOR_BOUNTY: { bg: "#FCEFCC", text: "#7A5300", dot: "#F2B233", label: "Creator bounties" },
  WITHDRAWAL: { bg: "#FBE3E0", text: "#A12E27", dot: "#D6453D", label: "Withdrawals" },
  ADJUSTMENT: { bg: "#ECECE6", text: "#454B5C", dot: "#8A8F9C", label: "Adjustments" },
};

export function ledgerStyle(type: string) {
  return (
    LEDGER_TYPE_STYLE[type] ?? { bg: "#ECECE6", text: "#454B5C", dot: "#8A8F9C", label: type }
  );
}

// Single source of truth for Premium pricing/payment details, used by the Premium page,
// the sidebar promo, and the Settings upsell. PREMIUM_PRICE_RS is mirrored (not enforced) by
// apps/subscriptions/admin.py's PREMIUM_PRICE_RS, kept in sync by a backend drift-guard test
// (TestPremiumPriceConstant) -- the server still never validates or rejects amount_paid, a
// human approves each request by comparing the receipt; the backend constant only drives a
// visible match/mismatch column in the admin to help that review.
export const PREMIUM_PRICE_RS = 2300;
export const PREMIUM_ORIGINAL_PRICE_RS = 5600;
export const PREMIUM_DURATION_DAYS = 30;

export const PREMIUM_PAY_TO = {
  accountTitle: "Fayyaz Liaquat",
  accountSubtitle: "Receiving payments for Digitize Online SMC (Pvt) Ltd",
  method: "Easypaisa",
  number: "03422082578",
};

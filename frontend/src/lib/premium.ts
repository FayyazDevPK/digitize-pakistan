// Single source of truth for Premium pricing/payment details, used by the Premium page,
// the sidebar promo, and the Settings upsell. No backend constant/drift-guard mirrors this:
// SubscriptionRequestView neither validates nor defaults amount_paid server-side (it accepts
// whatever the client submits), so there is nothing on the backend for this to drift against.
export const PREMIUM_PRICE_RS = 2300;
export const PREMIUM_ORIGINAL_PRICE_RS = 5600;
export const PREMIUM_DURATION_DAYS = 30;

export const PREMIUM_PAY_TO = {
  accountTitle: "Fayyaz Liaquat",
  accountSubtitle: "Receiving payments for Digitize Online SMC (Pvt) Ltd",
  method: "Easypaisa",
  number: "03422082578",
};

// Mirrors backend/apps/rewards/services.py and the "withdrawal" throttle in config/settings.py.
// backend/apps/rewards/tests.py (TestPayoutPolicyConstants) fails if these drift.
export const POINTS_PER_UNIT = 1000;
export const RS_PER_UNIT = 250;
export const MIN_WITHDRAWAL_RS = 2000;
export const MIN_WITHDRAWAL_POINTS = (MIN_WITHDRAWAL_RS / RS_PER_UNIT) * POINTS_PER_UNIT;
export const WITHDRAWAL_REQUESTS_PER_HOUR = 5;

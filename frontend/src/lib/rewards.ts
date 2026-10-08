// The reward amounts users are told about, in one place. These mirror the seeded RewardRules
// (apps/rewards/management/commands/seed_production.py, REWARD_RULES); the backend test
// apps/rewards/test_reward_constants.py fails if any value here stops matching them.
// Per-article read amounts shown on article pages come live from the API instead.
export const READ_REWARD = { free: 5, premium: 10 };
export const READ_DAILY_CAP = { free: 25, premium: 100 };
export const SIGNUP_BONUS = 100;
export const PATH_COMPLETION_BONUS = 500;
export const REFERRAL_BONUS = { free: 150, premium: 300 };
export const CREATOR_BOUNTY = 500; // Premium creators, per published piece

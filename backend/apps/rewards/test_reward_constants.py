import re
from decimal import Decimal
from pathlib import Path

from django.conf import settings

from apps.rewards.management.commands.seed_production import REWARD_RULES

SRC = (Path(settings.BASE_DIR).parent / "frontend/src/lib/rewards.ts").read_text()


def _pair(name):
    m = re.search(rf"{name} = \{{ free: ([\d.]+), premium: ([\d.]+) \}};", SRC)
    assert m, f"{name} not found in frontend/src/lib/rewards.ts"
    return Decimal(m.group(1)), Decimal(m.group(2))


def _single(name):
    m = re.search(rf"{name} = ([\d.]+);", SRC)
    assert m, f"{name} not found in frontend/src/lib/rewards.ts"
    return Decimal(m.group(1))


def _rule(tier, type_):
    matches = [r for r in REWARD_RULES if r[0] == tier and r[1] == type_]
    assert len(matches) == 1, (tier, type_)
    return matches[0]


class TestRewardConstantsMatchSeededRules:
    """frontend/src/lib/rewards.ts feeds the reward amounts shown in the UI and marketing
    copy; every figure must equal the seeded RewardRule (REWARD_RULES) it describes."""

    def test_read_reward_and_cap(self):
        assert _pair("READ_REWARD") == (
            _rule("FREE", "READ_ENGAGEMENT")[2],
            _rule("PREMIUM", "READ_ENGAGEMENT")[2],
        )
        assert _pair("READ_DAILY_CAP") == (
            _rule("FREE", "READ_ENGAGEMENT")[3],
            _rule("PREMIUM", "READ_ENGAGEMENT")[3],
        )

    def test_referral_bonus(self):
        assert _pair("REFERRAL_BONUS") == (
            _rule("FREE", "REFERRAL_BONUS")[2],
            _rule("PREMIUM", "REFERRAL_BONUS")[2],
        )

    def test_signup_and_path_completion_are_tier_independent(self):
        for const, type_ in (("SIGNUP_BONUS", "SIGNUP_BONUS"), ("PATH_COMPLETION_BONUS", "LEARNING_PATH_COMPLETION")):
            free, premium = _rule("FREE", type_)[2], _rule("PREMIUM", type_)[2]
            assert free == premium == _single(const), const

    def test_creator_bounty_is_the_premium_rule(self):
        assert _single("CREATOR_BOUNTY") == _rule("PREMIUM", "CREATOR_BOUNTY")[2]

    def test_every_seeded_type_is_covered_by_a_constant(self):
        covered = {"READ_ENGAGEMENT", "REFERRAL_BONUS", "SIGNUP_BONUS", "LEARNING_PATH_COMPLETION", "CREATOR_BOUNTY"}
        assert {r[1] for r in REWARD_RULES} == covered

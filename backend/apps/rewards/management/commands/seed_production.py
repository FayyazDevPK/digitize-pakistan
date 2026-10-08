"""
Seeds the RewardRule records (real business logic) and the ADSENSE ad slot
(real monetization mechanism, no advertiser-specific data needed) that
production requires to function.

Deliberately does NOT seed the DIRECT-advertiser AdSlot records that exist
in the dev database (Sarmaya, Bundle.pk, Adobe for Creativity) -- those are
fabricated demo content used for testing the ad system during development,
not real advertiser relationships. Add real direct-advertiser slots through
Django admin once real deals actually exist.

Idempotent: safe to run more than once, uses get_or_create throughout.
"""

from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.ads.models import AdSlot
from apps.rewards.models import RewardRule


# (tier, type, rate, daily_cap) -- the single source of truth for the seeded reward rules;
# apps/rewards/test_reward_constants.py checks frontend/src/lib/rewards.ts against this.
REWARD_RULES = [
    ("FREE", "READ_ENGAGEMENT", Decimal("5"), Decimal("25")),
    ("PREMIUM", "READ_ENGAGEMENT", Decimal("10"), Decimal("100")),
    ("FREE", "REFERRAL_BONUS", Decimal("150"), None),
    ("PREMIUM", "REFERRAL_BONUS", Decimal("300"), None),
    ("PREMIUM", "CREATOR_BOUNTY", Decimal("500"), None),
    ("FREE", "SIGNUP_BONUS", Decimal("100"), None),
    ("PREMIUM", "SIGNUP_BONUS", Decimal("100"), None),
    ("FREE", "LEARNING_PATH_COMPLETION", Decimal("500"), None),
    ("PREMIUM", "LEARNING_PATH_COMPLETION", Decimal("500"), None),
]


class Command(BaseCommand):
    help = "Seed RewardRule records and the real AdSense slot for production."

    def handle(self, *args, **options):
        reward_rules = REWARD_RULES

        for tier, reward_type, rate, daily_cap in reward_rules:
            obj, created = RewardRule.objects.get_or_create(
                tier=tier,
                type=reward_type,
                defaults={"rate": rate, "daily_cap": daily_cap, "is_active": True},
            )
            action = "Created" if created else "Already exists"
            self.stdout.write(f"{action}: {tier} / {reward_type} -> {rate} pts (cap {daily_cap})")

        obj, created = AdSlot.objects.get_or_create(
            placement="SIDEBAR",
            slot_type="ADSENSE",
        )
        action = "Created" if created else "Already exists"
        self.stdout.write(f"{action}: SIDEBAR / ADSENSE slot")

        self.stdout.write(self.style.SUCCESS("Production seed complete."))

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache

from apps.learning_paths.models import LearningPath, LearningPathProgress, Milestone
from apps.referrals.models import Referral
from apps.referrals.tasks import evaluate_referral_qualifications
from apps.rewards.models import RewardRule, RewardsLedgerEntry
from apps.rewards.services import get_balance

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def referral(db):
    RewardRule.objects.create(tier="FREE", type="REFERRAL_BONUS", rate=Decimal("100"), daily_cap=Decimal("1000"))
    referrer = User.objects.create_user(username="referrer", email="r@example.com", password="x")
    referred = User.objects.create_user(username="friend", email="f@example.com", password="x")
    return Referral.objects.create(referrer=referrer, referred=referred)


def complete_milestone(user):
    path = LearningPath.objects.create(title="P", slug="p")
    ms = Milestone.objects.create(learning_path=path, title="M", order=1)
    LearningPathProgress.objects.create(user=user, learning_path=path, milestone=ms)


@pytest.mark.django_db
class TestReferralQualification:
    def test_activity_without_verified_email_does_not_qualify(self, referral):
        complete_milestone(referral.referred)
        evaluate_referral_qualifications()
        referral.refresh_from_db()
        assert referral.status == "PENDING"
        assert not RewardsLedgerEntry.objects.filter(user=referral.referrer, type="REFERRAL_BONUS").exists()

    def test_verified_email_without_activity_does_not_qualify(self, referral):
        referral.referred.email_verified = True
        referral.referred.save()
        evaluate_referral_qualifications()
        referral.refresh_from_db()
        assert referral.status == "PENDING"

    def test_verifying_email_then_qualifies_and_pays_bonus_once(self, referral):
        complete_milestone(referral.referred)
        evaluate_referral_qualifications()
        assert Referral.objects.get(pk=referral.pk).status == "PENDING"

        referral.referred.email_verified = True
        referral.referred.save()
        evaluate_referral_qualifications()

        referral.refresh_from_db()
        assert referral.status == "REWARDED"
        assert get_balance(referral.referrer) == Decimal("100")
        evaluate_referral_qualifications()  # idempotent: no double payout
        assert get_balance(referral.referrer) == Decimal("100")

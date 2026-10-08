from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from apps.learning_paths.models import LearningPath, LearningPathProgress, Milestone
from apps.referrals.models import Referral
from apps.referrals.tasks import evaluate_referral_qualifications
from apps.content.models import Category, Content
from apps.rewards.models import ReadSession, RewardRule, RewardsLedgerEntry
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


def complete_milestone(user, read=True):
    """Complete a milestone; by default the user also has a recorded read of its lesson."""
    path = LearningPath.objects.create(title="P", slug="p")
    cat = Category.objects.get_or_create(slug="c", defaults={"name": "C"})[0]
    content = Content.objects.create(author=user, category=cat, title="Lesson", slug="lesson", type="NEWS", status="PUBLISHED", body="x")
    ms = Milestone.objects.create(learning_path=path, title="M", order=1, content=content)
    LearningPathProgress.objects.create(user=user, learning_path=path, milestone=ms)
    if read:
        ReadSession.objects.create(user=user, content=content, completed_at=timezone.now())


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


@pytest.mark.django_db
class TestReferralAntiAbuse:
    def test_milestone_clicked_without_reading_does_not_qualify(self, referral):
        complete_milestone(referral.referred, read=False)
        referral.referred.email_verified = True
        referral.referred.save()
        evaluate_referral_qualifications()
        referral.refresh_from_db()
        assert referral.status == "PENDING"
        assert get_balance(referral.referrer) == Decimal("0")

    def test_started_but_unfinished_read_does_not_qualify(self, referral):
        complete_milestone(referral.referred, read=False)
        ReadSession.objects.create(user=referral.referred, content=Content.objects.get(slug="lesson"))
        referral.referred.email_verified = True
        referral.referred.save()
        evaluate_referral_qualifications()
        referral.refresh_from_db()
        assert referral.status == "PENDING"

    def test_someone_elses_read_does_not_count(self, referral):
        complete_milestone(referral.referred, read=False)
        ReadSession.objects.create(
            user=referral.referrer, content=Content.objects.get(slug="lesson"), completed_at=timezone.now()
        )
        referral.referred.email_verified = True
        referral.referred.save()
        evaluate_referral_qualifications()
        referral.refresh_from_db()
        assert referral.status == "PENDING"

    def test_same_inbox_via_alias_never_qualifies(self, db):
        RewardRule.objects.create(tier="FREE", type="REFERRAL_BONUS", rate=Decimal("100"), daily_cap=Decimal("1000"))
        a = User.objects.create_user(username="a", email="same@gmail.com", password="x")
        # Legacy-style row: created without going through the alias check.
        b = User.objects.create_user(username="b", email="x@example.com", password="x")
        User.objects.filter(pk=b.pk).update(email="s.a.m.e+1@googlemail.com")
        b.refresh_from_db()
        ref = Referral.objects.create(referrer=a, referred=b)
        complete_milestone(b)
        b.email_verified = True
        b.save(update_fields=["email_verified"])
        evaluate_referral_qualifications()
        ref.refresh_from_db()
        assert ref.status == "PENDING"
        assert get_balance(a) == Decimal("0")

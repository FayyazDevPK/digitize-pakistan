import threading
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.utils import OperationalError

from apps.rewards.models import RewardRule, RewardsLedgerEntry
from apps.rewards.services import (
    BelowMinimumWithdrawal,
    InsufficientBalance,
    KYCNotApproved,
    RewardCapExceeded,
    award_points,
    get_balance,
    request_withdrawal,
)

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache():
    """
    Redis-backed daily-cap counters are external state that Django's
    per-test transaction rollback does NOT reset. Without this, tests
    can leak cap state into each other via reused auto-increment user
    IDs. Clear before and after every test.
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def free_user(db):
    user = User.objects.create_user(username="freeuser", password="testpass123")
    user.tier = "FREE"
    user.kyc_status = "NONE"
    user.save()
    return user


@pytest.fixture
def premium_kyc_user(db):
    user = User.objects.create_user(username="premiumuser", password="testpass123")
    user.tier = "PREMIUM"
    user.kyc_status = "APPROVED"
    user.save()
    return user


@pytest.fixture
def read_rule(db):
    return RewardRule.objects.create(
        tier="FREE", type="READ_ENGAGEMENT", rate=Decimal("5"), daily_cap=Decimal("25")
    )


@pytest.mark.django_db
class TestAwardPoints:
    def test_awards_points_correctly(self, free_user, read_rule):
        entry = award_points(free_user, "READ_ENGAGEMENT")
        assert entry.amount == Decimal("5")
        assert get_balance(free_user) == Decimal("5")

    def test_respects_daily_cap(self, free_user, read_rule):
        # cap is 25, rate is 5 -> exactly 5 successful awards allowed
        for _ in range(5):
            award_points(free_user, "READ_ENGAGEMENT")

        assert get_balance(free_user) == Decimal("25")

        with pytest.raises(RewardCapExceeded):
            award_points(free_user, "READ_ENGAGEMENT")

        # balance must not have changed after the capped attempt
        assert get_balance(free_user) == Decimal("25")

    def test_no_rule_raises_value_error(self, free_user):
        with pytest.raises(ValueError):
            award_points(free_user, "READ_ENGAGEMENT")


@pytest.mark.django_db(transaction=True)
class TestAwardPointsConcurrency:
    def test_daily_cap_holds_under_concurrent_requests(self, django_db_blocker):
        """
        Regression test for a real bug found during Phase 10 load testing:
        the daily-cap check used to be a plain cache.get()/cache.set(),
        which is NOT atomic. Under genuine concurrent load, many requests
        could all read the same "before" value and all pass the cap check
        together -- confirmed to let 50 concurrent requests through a 25pt
        cap with zero rejections before the fix (atomic cache.add()+incr()).

        Uses real threads (not asyncio) to reproduce actual concurrent DB/
        cache access, same as a burst of real simultaneous requests would.
        """
        with django_db_blocker.unblock():
            User.objects.filter(username="concurrencytest").delete()
            user = User.objects.create_user(username="concurrencytest", password="x")
            user.tier = "FREE"
            user.save()
            RewardRule.objects.get_or_create(
                tier="FREE",
                type="READ_ENGAGEMENT",
                defaults=dict(rate=Decimal("5"), daily_cap=Decimal("25"), is_active=True),
            )

        results = {"awarded": 0, "capped": 0, "sqlite_lock": 0, "errors": 0}
        lock = threading.Lock()

        def worker():
            try:
                with django_db_blocker.unblock():
                    award_points(user, "READ_ENGAGEMENT")
                with lock:
                    results["awarded"] += 1
            except RewardCapExceeded:
                with lock:
                    results["capped"] += 1
            except OperationalError as e:
                # SQLite only allows one writer at a time. Under 50 real
                # concurrent threads all trying to INSERT, some will hit
                # "database is locked" -- a dev-database limitation, not a
                # flaw in the atomic cap logic itself (PostgreSQL, the
                # planned production database, does not have this
                # limitation). Treat as "request didn't complete", not a
                # correctness failure -- the invariant we actually care
                # about (final balance never exceeds the cap) is asserted
                # below regardless of how many requests hit this.
                if "locked" in str(e):
                    with lock:
                        results["sqlite_lock"] += 1
                else:
                    with lock:
                        results["errors"] += 1
                    print(f"Unexpected OperationalError: {e}")
            except Exception as e:
                with lock:
                    results["errors"] += 1
                print(f"Unexpected error type: {type(e).__name__}: {e}")

        threads = [threading.Thread(target=worker) for _ in range(50)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        with django_db_blocker.unblock():
            final_balance = get_balance(user)
            user.delete()

        # The one invariant that actually matters: the cap must never be
        # exceeded, no matter how many requests got capped vs. lock-
        # contended (SQLite-only) vs. succeeded.
        assert results["errors"] == 0
        assert final_balance <= Decimal("25")
        assert results["awarded"] <= 5


@pytest.mark.django_db
class TestRequestWithdrawal:
    def test_blocks_without_kyc_approval(self, free_user):
        with pytest.raises(KYCNotApproved):
            request_withdrawal(free_user, 8000, "EASYPAISA", "03001234567")

    def test_blocks_below_minimum(self, premium_kyc_user):
        with pytest.raises(BelowMinimumWithdrawal):
            request_withdrawal(premium_kyc_user, 100, "EASYPAISA", "03001234567")

    def test_blocks_insufficient_balance(self, premium_kyc_user):
        with pytest.raises(InsufficientBalance):
            request_withdrawal(premium_kyc_user, 8000, "EASYPAISA", "03001234567")

    def test_succeeds_and_deducts_balance(self, premium_kyc_user, db):
        # manually credit points via a direct ledger entry, same as the ADJUSTMENT
        # mechanism used in manual testing earlier
        from apps.rewards.models import RewardsLedgerEntry

        RewardsLedgerEntry.objects.create(
            user=premium_kyc_user,
            type="ADJUSTMENT",
            amount=Decimal("10000"),
            balance_after=Decimal("10000"),
            status="CONFIRMED",
        )

        withdrawal = request_withdrawal(premium_kyc_user, 8000, "EASYPAISA", "03001234567")

        assert withdrawal.amount_rs == Decimal("2000.00")
        assert withdrawal.status == "REQUESTED"
        assert get_balance(premium_kyc_user) == Decimal("2000")


class TestPayoutPolicyConstants:
    """The public /payout-policy page renders frontend/src/lib/payout.ts; keep it in sync."""

    def test_frontend_payout_constants_match_backend(self):
        import re
        from pathlib import Path

        from django.conf import settings

        from apps.rewards.services import MIN_WITHDRAWAL_RS, POINTS_TO_RS

        src = (Path(settings.BASE_DIR).parent / "frontend/src/lib/payout.ts").read_text()
        num = lambda name: Decimal(re.search(rf"{name} = ([\d_.]+);", src).group(1).replace("_", ""))

        assert num("RS_PER_UNIT") / num("POINTS_PER_UNIT") == POINTS_TO_RS
        assert num("MIN_WITHDRAWAL_RS") == MIN_WITHDRAWAL_RS
        rate = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["withdrawal"]
        assert rate == f"{num('WITHDRAWAL_REQUESTS_PER_HOUR')}/hour"


@pytest.mark.django_db
class TestSignupBonus:
    def _rule(self):
        return RewardRule.objects.create(tier="FREE", type="SIGNUP_BONUS", rate=Decimal("100"), daily_cap=None)

    def test_awards_once_on_verification(self):
        from apps.rewards.services import award_signup_bonus_once

        self._rule()
        user = User.objects.create_user(username="bonususer", password="x")
        entry = award_signup_bonus_once(user)
        assert entry is not None
        assert entry.type == "SIGNUP_BONUS" and entry.amount == Decimal("100")
        assert get_balance(user) == Decimal("100")

    def test_never_awarded_twice(self):
        from apps.rewards.services import award_signup_bonus_once

        self._rule()
        user = User.objects.create_user(username="bonususer2", password="x")
        first = award_signup_bonus_once(user)
        second = award_signup_bonus_once(user)
        assert first is not None
        assert second is None
        assert get_balance(user) == Decimal("100")
        assert RewardsLedgerEntry.objects.filter(user=user, type="SIGNUP_BONUS").count() == 1

    def test_sends_notification(self):
        from apps.notifications.models import Notification
        from apps.rewards.services import award_signup_bonus_once

        self._rule()
        user = User.objects.create_user(username="bonususer3", password="x")
        award_signup_bonus_once(user)
        assert Notification.objects.filter(user=user, type="REWARD", title__icontains="bonus").exists()

    def test_view_flow_awards_bonus_on_real_verification(self, mailoutbox):
        import re

        from rest_framework.test import APIClient

        self._rule()
        RewardRule.objects.create(tier="PREMIUM", type="SIGNUP_BONUS", rate=Decimal("100"), daily_cap=None)
        client = APIClient()
        res = client.post(
            "/api/register/",
            {"username": "verifyflow", "email": "verifyflow@example.com", "password": "Str0ngPass!x"},
            format="json",
        )
        assert res.status_code == 201
        user = User.objects.get(username="verifyflow")
        assert get_balance(user) == Decimal("0.00")  # not awarded at signup

        m = re.search(r"\?uid=([^&\s]+)&token=([^\s]+)", mailoutbox[0].body)
        confirm = client.post("/api/verify-email/", {"uid": m.group(1), "token": m.group(2)}, format="json")
        assert confirm.status_code == 200
        user.refresh_from_db()
        assert get_balance(user) == Decimal("100")

        # Re-submitting the same token a second time must not award again.
        client.post("/api/verify-email/", {"uid": m.group(1), "token": m.group(2)}, format="json")
        assert get_balance(user) == Decimal("100")


@pytest.mark.django_db
class TestEarnedThisWeek:
    def test_excludes_entries_older_than_seven_days(self):
        from datetime import timedelta

        from django.utils import timezone

        from apps.rewards.services import get_earned_this_week

        user = User.objects.create_user(username="weekuser1", password="x")
        recent = RewardsLedgerEntry.objects.create(
            user=user, type="READ_ENGAGEMENT", amount=100, balance_after=100
        )
        old = RewardsLedgerEntry.objects.create(
            user=user, type="READ_ENGAGEMENT", amount=500, balance_after=600
        )
        RewardsLedgerEntry.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(days=10)
        )
        assert get_earned_this_week(user) == Decimal("100")

    def test_excludes_adjustment_and_withdrawal(self):
        from apps.rewards.services import get_earned_this_week

        user = User.objects.create_user(username="weekuser2", password="x")
        RewardsLedgerEntry.objects.create(
            user=user, type="READ_ENGAGEMENT", amount=50, balance_after=50
        )
        RewardsLedgerEntry.objects.create(
            user=user, type="ADJUSTMENT", amount=10000, balance_after=10050, note="credit"
        )
        RewardsLedgerEntry.objects.create(
            user=user, type="WITHDRAWAL", amount=-20, balance_after=10030
        )
        assert get_earned_this_week(user) == Decimal("50")

    def test_includes_all_four_earning_types_within_window(self):
        from apps.rewards.services import EARNING_TYPES, get_earned_this_week

        user = User.objects.create_user(username="weekuser3", password="x")
        balance = Decimal("0")
        for t in EARNING_TYPES:
            balance += 10
            RewardsLedgerEntry.objects.create(user=user, type=t, amount=10, balance_after=balance)
        assert get_earned_this_week(user) == Decimal("10") * len(EARNING_TYPES)

    def test_zero_when_no_recent_earning_entries(self):
        from apps.rewards.services import get_earned_this_week

        user = User.objects.create_user(username="weekuser4", password="x")
        assert get_earned_this_week(user) == Decimal("0.00")

    def test_balance_endpoint_returns_earned_this_week(self):
        from datetime import timedelta

        from django.utils import timezone
        from rest_framework.test import APIClient

        user = User.objects.create_user(username="weekuser5", password="x")
        RewardsLedgerEntry.objects.create(
            user=user, type="READ_ENGAGEMENT", amount=50, balance_after=50
        )
        old = RewardsLedgerEntry.objects.create(
            user=user, type="REFERRAL_BONUS", amount=150, balance_after=200
        )
        RewardsLedgerEntry.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(days=8)
        )
        RewardsLedgerEntry.objects.create(
            user=user, type="ADJUSTMENT", amount=5000, balance_after=5200, note="credit"
        )

        client = APIClient()
        client.force_authenticate(user)
        res = client.get("/api/rewards/balance/")
        assert res.status_code == 200
        assert Decimal(res.data["earned_this_week"]) == Decimal("50")
        assert Decimal(res.data["balance"]) == Decimal("5200")

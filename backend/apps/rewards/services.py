from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models import Sum

from apps.notifications.services import notify

from .models import RewardRule, RewardsLedgerEntry, WithdrawalRequest

POINTS_TO_RS = Decimal("0.25")  # 1,000 pts = Rs 250
MIN_WITHDRAWAL_RS = Decimal("2000")

# Redis INCR/INCRBY only work on integers. Rates carry up to 4 decimal
# places (see RewardRule.rate), so we scale to an integer for the atomic
# counter and scale back down when comparing against the cap.
_CAP_SCALE = 10000

User = get_user_model()


class RewardCapExceeded(Exception):
    pass


class KYCNotApproved(Exception):
    pass


class InsufficientBalance(Exception):
    pass


class BelowMinimumWithdrawal(Exception):
    pass


def _daily_cache_key(user_id, reward_type):
    return f"reward_daily:{user_id}:{reward_type}:{date.today().isoformat()}"


def get_balance(user):
    total = RewardsLedgerEntry.objects.filter(user=user, status="CONFIRMED").aggregate(
        total=Sum("amount")
    )["total"]
    return total or Decimal("0.00")


def award_points(user, reward_type, source_content=None):
    """
    Awards points to a user for a given reward type, respecting the
    RewardRule for their tier and the daily cap (tracked in Redis).
    Raises RewardCapExceeded if today's cap is already reached.
    Returns the created RewardsLedgerEntry.
    """
    try:
        rule = RewardRule.objects.get(tier=user.tier, type=reward_type, is_active=True)
    except RewardRule.DoesNotExist:
        raise ValueError(f"No active reward rule for tier={user.tier}, type={reward_type}")

    if rule.daily_cap is not None:
        # Atomically reserve this award's points against the daily cap
        # BEFORE doing anything else. cache.add() (Redis SETNX) and
        # cache.incr() (Redis INCRBY) are both atomic at the Redis level,
        # which avoids a read-then-write race: a plain cache.get() then
        # cache.set() pattern lets concurrent requests all read the same
        # "before" value and all pass the cap check together. Confirmed by
        # load testing: the old pattern let 50 concurrent requests through
        # against a 25pt cap with zero rejections.
        cache_key = _daily_cache_key(user.id, reward_type)
        rate_scaled = int(rule.rate * _CAP_SCALE)

        cache.add(cache_key, 0, timeout=90000)
        new_total_scaled = cache.incr(cache_key, rate_scaled)

        if Decimal(new_total_scaled) / _CAP_SCALE > rule.daily_cap:
            # Roll back the reservation since this award is being rejected.
            cache.decr(cache_key, rate_scaled)
            raise RewardCapExceeded(f"Daily cap of {rule.daily_cap} reached for {reward_type}")

    balance = get_balance(user) + rule.rate

    entry = RewardsLedgerEntry.objects.create(
        user=user,
        type=reward_type,
        amount=rule.rate,
        balance_after=balance,
        source_content=source_content,
        status="CONFIRMED",
    )

    return entry


def award_signup_bonus_once(user):
    """
    Awards the one-time SIGNUP_BONUS the Register page promises, on successful email
    verification (not at signup, so it can't be farmed with unverifiable addresses).

    Guarded against double-award under concurrency (a user retrying verification, or two
    requests racing) the same way request_withdrawal guards its balance check: lock the
    user's row, then check-then-create inside that lock, so two concurrent callers can't
    both pass the "not yet awarded" check before either has created the ledger entry.
    Not retroactive: only fires on a genuine unverified->verified transition, so accounts
    that were already verified before this feature shipped are never backfilled.

    Returns the created RewardsLedgerEntry, or None if already awarded.
    """
    with transaction.atomic():
        User.objects.select_for_update().get(pk=user.pk)
        if RewardsLedgerEntry.objects.filter(user=user, type="SIGNUP_BONUS").exists():
            return None
        entry = award_points(user, "SIGNUP_BONUS")

    notify(
        user,
        "REWARD",
        "Signup bonus credited",
        f"Thanks for verifying your email — {entry.amount:,.0f} points are now in your balance.",
        link="/rewards",
    )
    return entry


def request_withdrawal(user, points, method, account_ref):
    """
    Creates a withdrawal request for `points`, converted to Rs at the
    fixed POINTS_TO_RS rate.

    HARD SECURITY BOUNDARY: no withdrawal is created unless the user's
    KYC status is APPROVED. This check lives here, in the service layer,
    not in the view or the frontend -- this is the one place that must
    never be bypassed.

    CONCURRENCY: the balance check and the deduction are wrapped in a
    transaction that locks the user's row (select_for_update) for the
    duration. Without this, two concurrent withdrawal requests could
    both read the same balance before either deducts, both pass the
    "sufficient balance" check, and both succeed -- an overdraft / double
    -withdrawal. Same class of bug already found and fixed for the daily
    reward cap, but that fix used an atomic Redis counter since the cap
    is cache-backed; the balance here is a database aggregate, so the
    fix is a row lock instead.

    NOTE: SQLite (the dev database) does not enforce row-level locking,
    so this cannot be fully proven under local development the same way
    it was for the Redis-based fix -- this must be re-verified under
    PostgreSQL (the production database) before launch.
    """
    if user.kyc_status != "APPROVED":
        raise KYCNotApproved("KYC approval is required before withdrawal.")

    points = Decimal(points)
    amount_rs = points * POINTS_TO_RS

    if amount_rs < MIN_WITHDRAWAL_RS:
        raise BelowMinimumWithdrawal(
            f"Minimum withdrawal is Rs {MIN_WITHDRAWAL_RS} ({MIN_WITHDRAWAL_RS / POINTS_TO_RS:.0f} pts)."
        )

    with transaction.atomic():
        # Lock this user's row so a concurrent withdrawal request for the
        # same user has to wait for this transaction to commit or roll
        # back before it can proceed -- serializing the check-then-deduct
        # sequence per user.
        User.objects.select_for_update().get(pk=user.pk)

        balance = get_balance(user)
        if points > balance:
            raise InsufficientBalance(
                f"Insufficient balance: have {balance}, requested {points}."
            )

        new_balance = balance - points

        RewardsLedgerEntry.objects.create(
            user=user,
            type="WITHDRAWAL",
            amount=-points,
            balance_after=new_balance,
            status="CONFIRMED",
        )

        withdrawal = WithdrawalRequest.objects.create(
            user=user,
            points_requested=points,
            amount_rs=amount_rs,
            method=method,
            account_ref=account_ref,
            status="REQUESTED",
        )

    return withdrawal

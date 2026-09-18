from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.db.models import Sum

from .models import RewardRule, RewardsLedgerEntry, WithdrawalRequest

POINTS_TO_RS = Decimal("0.25")  # 1,000 pts = Rs 250
MIN_WITHDRAWAL_RS = Decimal("2000")


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

    cache_key = _daily_cache_key(user.id, reward_type)
    current_today = Decimal(cache.get(cache_key, "0"))

    if rule.daily_cap is not None and current_today + rule.rate > rule.daily_cap:
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

    new_today = current_today + rule.rate
    cache.set(cache_key, str(new_today), timeout=90000)

    return entry


def request_withdrawal(user, points, method, account_ref):
    """
    Creates a withdrawal request for `points`, converted to Rs at the
    fixed POINTS_TO_RS rate.

    HARD SECURITY BOUNDARY: no withdrawal is created unless the user's
    KYC status is APPROVED. This check lives here, in the service layer,
    not in the view or the frontend -- this is the one place that must
    never be bypassed.
    """
    if user.kyc_status != "APPROVED":
        raise KYCNotApproved("KYC approval is required before withdrawal.")

    points = Decimal(points)
    amount_rs = points * POINTS_TO_RS

    if amount_rs < MIN_WITHDRAWAL_RS:
        raise BelowMinimumWithdrawal(
            f"Minimum withdrawal is Rs {MIN_WITHDRAWAL_RS} ({MIN_WITHDRAWAL_RS / POINTS_TO_RS:.0f} pts)."
        )

    balance = get_balance(user)
    if points > balance:
        raise InsufficientBalance(f"Insufficient balance: have {balance}, requested {points}.")

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

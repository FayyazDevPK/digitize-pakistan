from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.db.models import Sum

from .models import RewardRule, RewardsLedgerEntry


class RewardCapExceeded(Exception):
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

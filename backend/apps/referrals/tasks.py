from celery import shared_task

from apps.learning_paths.models import LearningPathProgress
from apps.notifications.services import notify
from apps.rewards.services import RewardCapExceeded, award_points

from .models import Referral


@shared_task
def evaluate_referral_qualifications():
    pending = Referral.objects.filter(status="PENDING")
    qualified_count = 0

    for ref in pending:
        # Both required: a completed milestone (real activity) AND a verified email, so farming
        # bonuses needs a working inbox per fake account, not just a username.
        has_activity = LearningPathProgress.objects.filter(user=ref.referred).exists()
        if not has_activity or not ref.referred.email_verified:
            continue

        ref.status = "QUALIFIED"
        ref.save(update_fields=["status"])

        try:
            entry = award_points(ref.referrer, "REFERRAL_BONUS")
            ref.status = "REWARDED"
            ref.save(update_fields=["status"])
            notify(
                ref.referrer,
                "REFERRAL",
                "Referral bonus earned",
                f"{ref.referred.username} qualified — you earned {entry.amount:,.0f} pts.",
                link="/referrals",
            )
        except (RewardCapExceeded, ValueError):
            pass

        qualified_count += 1

    return f"Qualified {qualified_count} referral(s)"

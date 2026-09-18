from celery import shared_task

from apps.learning_paths.models import LearningPathProgress
from apps.rewards.services import RewardCapExceeded, award_points

from .models import Referral


@shared_task
def evaluate_referral_qualifications():
    pending = Referral.objects.filter(status="PENDING")
    qualified_count = 0

    for ref in pending:
        has_activity = LearningPathProgress.objects.filter(user=ref.referred).exists()
        if not has_activity:
            continue

        ref.status = "QUALIFIED"
        ref.save(update_fields=["status"])

        try:
            award_points(ref.referrer, "REFERRAL_BONUS")
            ref.status = "REWARDED"
            ref.save(update_fields=["status"])
        except (RewardCapExceeded, ValueError):
            pass

        qualified_count += 1

    return f"Qualified {qualified_count} referral(s)"

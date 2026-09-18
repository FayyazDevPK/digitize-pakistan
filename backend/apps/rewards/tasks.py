from celery import shared_task
from django.contrib.auth import get_user_model

from .services import RewardCapExceeded, award_points


@shared_task
def award_read_engagement(user_id, content_id=None):
    User = get_user_model()
    from apps.content.models import Content

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return "user not found"

    content = None
    if content_id:
        content = Content.objects.filter(id=content_id).first()

    try:
        entry = award_points(user, "READ_ENGAGEMENT", source_content=content)
        return f"awarded {entry.amount} pts to user {user_id}"
    except RewardCapExceeded as e:
        return f"capped: {e}"
    except ValueError as e:
        return f"error: {e}"

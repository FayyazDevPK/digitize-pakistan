from .models import Notification


def notify(user, type, title, message="", link=""):
    return Notification.objects.create(
        user=user, type=type, title=title, message=message, link=link
    )

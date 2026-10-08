from collections import defaultdict

from django.core.management.base import BaseCommand

from apps.accounts.email_utils import normalize_email
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Read-only: list existing accounts whose emails collide under the normalized-email rule."

    def handle(self, *args, **options):
        groups = defaultdict(list)
        for u in User.objects.exclude(email="").order_by("id"):
            groups[normalize_email(u.email)].append(u)
        colliding = {k: v for k, v in groups.items() if len(v) > 1}
        for key, users in colliding.items():
            self.stdout.write(f"{key}: " + ", ".join(f"{u.username} <{u.email}>" for u in users))
        extra = sum(len(v) - 1 for v in colliding.values())
        accounts = sum(len(v) for v in colliding.values())
        self.stdout.write(
            f"{len(colliding)} colliding group(s); {accounts} account(s) involved "
            f"({extra} beyond the first in each group)."
        )

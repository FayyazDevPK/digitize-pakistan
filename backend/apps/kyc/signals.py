from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notifications.services import notify

from .models import KYCRecord


@receiver(post_save, sender=KYCRecord)
def sync_user_kyc_status(sender, instance, **kwargs):
    user = instance.user

    # Bug fix: the previous version only synced PENDING when the user's
    # prior status was NONE, so a resubmission after REJECTED/EXPIRED left
    # User.kyc_status permanently stuck at the old terminal state, even
    # though the real latest KYCRecord was genuinely PENDING again. The
    # denormalized field must always reflect the newest record's status,
    # not just first-time submissions.
    if user.kyc_status != instance.status:
        user.kyc_status = instance.status
        user.save(update_fields=["kyc_status"])

        if instance.status == "APPROVED":
            notify(
                user,
                "KYC",
                "Your KYC was approved",
                "You can now withdraw your rewards balance.",
                link="/rewards",
            )
        elif instance.status == "REJECTED":
            notify(
                user,
                "KYC",
                "Your KYC was rejected",
                instance.rejection_reason or "Please review and resubmit your documents.",
                link="/kyc",
            )

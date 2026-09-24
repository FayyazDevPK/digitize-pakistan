from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.notifications.services import notify

from .models import KYCRecord


def _resync_kyc_status(user):
    """
    Recomputes user.kyc_status from the real latest remaining KYCRecord.
    Used when a record is deleted (e.g. an admin clearing out test data,
    or any future deletion path), since the denormalized field must never
    be allowed to drift from what the actual records show -- same class
    of bug already found and fixed once for the save side (resubmission
    after rejection); this covers the delete side, which previously had
    no signal handler at all.
    """
    latest = KYCRecord.objects.filter(user=user).order_by("-submitted_at").first()
    new_status = latest.status if latest else "NONE"
    if user.kyc_status != new_status:
        user.kyc_status = new_status
        user.save(update_fields=["kyc_status"])


@receiver(post_save, sender=KYCRecord)
def sync_user_kyc_status_on_save(sender, instance, **kwargs):
    user = instance.user

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


@receiver(post_delete, sender=KYCRecord)
def sync_user_kyc_status_on_delete(sender, instance, **kwargs):
    _resync_kyc_status(instance.user)

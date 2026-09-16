from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import KYCRecord


@receiver(post_save, sender=KYCRecord)
def sync_user_kyc_status(sender, instance, **kwargs):
    user = instance.user
    if instance.status in ("APPROVED", "REJECTED", "EXPIRED"):
        if user.kyc_status != instance.status:
            user.kyc_status = instance.status
            user.save(update_fields=["kyc_status"])
    elif instance.status == "PENDING" and user.kyc_status == "NONE":
        user.kyc_status = "PENDING"
        user.save(update_fields=["kyc_status"])

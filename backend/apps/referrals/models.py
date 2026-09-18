from django.conf import settings
from django.db import models


class Referral(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("QUALIFIED", "Qualified"),
        ("REWARDED", "Rewarded"),
    ]

    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referrals_made"
    )
    referred = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referred_by_record"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.referrer} -> {self.referred} ({self.status})"

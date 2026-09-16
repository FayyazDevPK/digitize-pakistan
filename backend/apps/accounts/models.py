from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("USER", "User"),
        ("CREATOR", "Creator"),
        ("MODERATOR", "Moderator"),
        ("ADMIN", "Admin"),
    ]
    TIER_CHOICES = [
        ("FREE", "Free"),
        ("PREMIUM", "Premium"),
    ]
    KYC_STATUS_CHOICES = [
        ("NONE", "None"),
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("EXPIRED", "Expired"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="USER")
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default="FREE")
    tier_expires_at = models.DateTimeField(null=True, blank=True)
    is_verified_badge = models.BooleanField(default=False)
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default="NONE")
    referred_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals"
    )
    display_name = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)

    def __str__(self):
        return self.username

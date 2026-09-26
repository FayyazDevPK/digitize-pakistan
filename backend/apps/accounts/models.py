import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower

from apps.kyc.validators import avatar_upload_path, validate_image_file


class User(AbstractUser):
    CITY_CHOICES = [
        (c, c)
        for c in (
            "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan",
            "Peshawar", "Quetta", "Hyderabad", "Sialkot", "Other",
        )
    ]
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
    referral_code = models.CharField(max_length=12, unique=True, blank=True)
    display_name = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)
    avatar = models.ImageField(upload_to=avatar_upload_path, blank=True, validators=[validate_image_file])
    phone = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=30, choices=CITY_CHOICES, blank=True)
    email_digests = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(null=True, blank=True)

    class Meta(AbstractUser.Meta):
        constraints = [
            # Case-insensitive uniqueness; blank emails (legacy/admin-created users) are exempt.
            models.UniqueConstraint(
                Lower("email"), condition=~models.Q(email=""), name="unique_user_email_ci"
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.referral_code:
            code = secrets.token_hex(4).upper()
            while User.objects.filter(referral_code=code).exists():
                code = secrets.token_hex(4).upper()
            self.referral_code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

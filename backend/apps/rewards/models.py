from django.conf import settings
from django.db import models

from apps.content.models import Content


class RewardRule(models.Model):
    TIER_CHOICES = [
        ("FREE", "Free"),
        ("PREMIUM", "Premium"),
    ]
    TYPE_CHOICES = [
        ("READ_ENGAGEMENT", "Read Engagement"),
        ("REFERRAL_BONUS", "Referral Bonus"),
        ("CREATOR_BOUNTY", "Creator Bounty"),
    ]

    tier = models.CharField(max_length=20, choices=TIER_CHOICES)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    rate = models.DecimalField(max_digits=10, decimal_places=4, help_text="Points awarded per unit")
    daily_cap = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("tier", "type")

    def __str__(self):
        return f"{self.tier} / {self.type}: {self.rate} pts (cap {self.daily_cap})"


class RewardsLedgerEntry(models.Model):
    TYPE_CHOICES = [
        ("READ_ENGAGEMENT", "Read Engagement"),
        ("REFERRAL_BONUS", "Referral Bonus"),
        ("CREATOR_BOUNTY", "Creator Bounty"),
        ("WITHDRAWAL", "Withdrawal"),
        ("ADJUSTMENT", "Adjustment"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("CONFIRMED", "Confirmed"),
        ("REVERSED", "Reversed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ledger_entries"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    source_content = models.ForeignKey(
        Content, null=True, blank=True, on_delete=models.SET_NULL, related_name="ledger_entries"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="CONFIRMED")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} {self.amount:+} pts ({self.type})"

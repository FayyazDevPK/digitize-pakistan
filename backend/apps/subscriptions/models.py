from django.conf import settings
from django.db import models

from apps.kyc.validators import receipt_upload_path, validate_receipt_file


class SubscriptionRequest(models.Model):
    METHOD_CHOICES = [
        ("EASYPAISA", "Easypaisa"),
        ("JAZZCASH", "JazzCash"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription_requests"
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    transaction_ref = models.CharField(max_length=100)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    iban = models.CharField(max_length=34, blank=True)
    receipt_file = models.ImageField(
        upload_to=receipt_upload_path, blank=True, validators=[validate_receipt_file]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="subscription_reviews",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_at"]

    def __str__(self):
        return f"{self.user} - Rs {self.amount_paid} ({self.status})"

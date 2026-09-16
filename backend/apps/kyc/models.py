from django.conf import settings
from django.db import models


class KYCRecord(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("EXPIRED", "Expired"),
    ]
    DOCUMENT_TYPE_CHOICES = [
        ("CNIC", "CNIC"),
        ("PASSPORT", "Passport"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kyc_records"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    document_ref_url = models.URLField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="kyc_reviews",
    )
    rejection_reason = models.TextField(blank=True)
    audit_trail = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.user} - {self.status}"

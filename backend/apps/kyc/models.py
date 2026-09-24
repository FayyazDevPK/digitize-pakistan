from django.conf import settings
from django.db import models

from .validators import (
    kyc_upload_path,
    validate_cnic_number,
    validate_document_file,
    validate_image_file,
)


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
    document_ref_url = models.URLField(blank=True)
    document_file = models.FileField(
        upload_to=kyc_upload_path, blank=True, validators=[validate_document_file]
    )
    # Full submission (new records). Blank on legacy rows that used document_file / document_ref_url.
    full_name = models.CharField(max_length=150, blank=True)
    cnic_number = models.CharField(max_length=15, blank=True, validators=[validate_cnic_number])
    cnic_front = models.ImageField(upload_to=kyc_upload_path, blank=True, validators=[validate_image_file])
    cnic_back = models.ImageField(upload_to=kyc_upload_path, blank=True, validators=[validate_image_file])
    selfie = models.ImageField(upload_to=kyc_upload_path, blank=True, validators=[validate_image_file])
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

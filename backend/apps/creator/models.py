from django.conf import settings
from django.db import models

from apps.content.models import Content


class CreatorProfile(models.Model):
    STATUS_CHOICES = [
        ("APPLIED", "Applied"),
        ("APPROVED", "Approved"),
        ("SUSPENDED", "Suspended"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="creator_profile"
    )
    bio = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="APPLIED")
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    published_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.user} ({self.status})"


class ContentSubmission(models.Model):
    REVIEW_STATUS_CHOICES = [
        ("SUBMITTED", "Submitted"),
        ("IN_REVIEW", "In Review"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    creator_profile = models.ForeignKey(
        CreatorProfile, on_delete=models.CASCADE, related_name="submissions"
    )
    content = models.OneToOneField(Content, on_delete=models.CASCADE, related_name="submission")
    review_status = models.CharField(
        max_length=20, choices=REVIEW_STATUS_CHOICES, default="SUBMITTED"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="content_reviews",
    )
    review_notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.content.title} ({self.review_status})"

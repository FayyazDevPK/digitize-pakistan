from django.conf import settings
from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ("SYSTEM", "System"),
        ("KYC", "KYC"),
        ("REWARD", "Reward"),
        ("REFERRAL", "Referral"),
        ("CREATOR", "Creator"),
        ("CONTENT", "Content"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="SYSTEM")
    title = models.CharField(max_length=255)
    message = models.CharField(max_length=500, blank=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.title}"

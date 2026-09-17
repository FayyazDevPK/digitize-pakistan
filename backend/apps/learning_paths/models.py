from django.conf import settings
from django.db import models

from apps.content.models import Content


class LearningPath(models.Model):
    ACCESS_TIER_CHOICES = [
        ("FREE", "Free"),
        ("PREMIUM", "Premium"),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    access_tier = models.CharField(max_length=20, choices=ACCESS_TIER_CHOICES, default="FREE")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class Milestone(models.Model):
    learning_path = models.ForeignKey(
        LearningPath, on_delete=models.CASCADE, related_name="milestones"
    )
    title = models.CharField(max_length=255)
    content = models.ForeignKey(
        Content, null=True, blank=True, on_delete=models.SET_NULL, related_name="milestones"
    )
    order = models.PositiveIntegerField(default=0)
    is_free = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.learning_path.title} - {self.title}"


class LearningPathProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_progress"
    )
    learning_path = models.ForeignKey(
        LearningPath, on_delete=models.CASCADE, related_name="progress_entries"
    )
    milestone = models.ForeignKey(
        Milestone, on_delete=models.CASCADE, related_name="progress_entries"
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "milestone")

    def __str__(self):
        return f"{self.user} completed {self.milestone}"

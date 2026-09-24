from django.conf import settings
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children"
    )

    class Meta:
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Content(models.Model):
    TYPE_CHOICES = [
        ("NEWS", "News"),
        ("TUTORIAL", "Tutorial"),
        ("GUIDE", "Guide"),
        ("TOOL_LISTING", "Tool Listing"),
    ]
    VISIBILITY_CHOICES = [
        ("PUBLIC", "Public"),
        ("PREMIUM_ONLY", "Premium Only"),
    ]
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("IN_REVIEW", "In Review"),
        ("PUBLISHED", "Published"),
        ("REJECTED", "Rejected"),
        ("ARCHIVED", "Archived"),
    ]

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="content"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    body = models.TextField()
    excerpt = models.CharField(max_length=500, blank=True)
    cover_image_url = models.URLField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="content")
    tags = models.JSONField(default=list, blank=True)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="PUBLIC")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    published_at = models.DateTimeField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=0)
    # Tool-listing fields (blank for other content types). pros/cons are one item per line.
    pros = models.TextField(blank=True, help_text="One short point per line.")
    cons = models.TextField(blank=True, help_text="One short point per line.")
    pricing_info = models.TextField(
        blank=True, help_text="Free text, one pricing line per line (e.g. 'Free tier available')."
    )
    alternatives = models.ManyToManyField(
        "self",
        symmetrical=False,
        blank=True,
        related_name="alternative_to",
        limit_choices_to={"type": "TOOL_LISTING"},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

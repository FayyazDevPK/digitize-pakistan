from django.db import models


class AdSlot(models.Model):
    PLACEMENT_CHOICES = [
        ("HOMEPAGE_HERO", "Homepage Hero"),
        ("ARTICLE_INLINE", "Article Inline"),
        ("SIDEBAR", "Sidebar"),
        ("FOOTER", "Footer"),
    ]
    SLOT_TYPE_CHOICES = [
        ("ADSENSE", "Google AdSense"),
        ("DIRECT", "Direct Advertiser"),
    ]

    placement = models.CharField(max_length=30, choices=PLACEMENT_CHOICES)
    slot_type = models.CharField(max_length=20, choices=SLOT_TYPE_CHOICES)
    is_active = models.BooleanField(default=True)

    # AdSense fields
    ad_client = models.CharField(max_length=50, blank=True, help_text="e.g. ca-pub-XXXXXXXXXX")
    ad_slot_id = models.CharField(max_length=50, blank=True)

    # Direct advertiser fields
    advertiser_name = models.CharField(max_length=150, blank=True)
    image_url = models.URLField(blank=True)
    target_url = models.URLField(blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        label = self.advertiser_name if self.slot_type == "DIRECT" else "AdSense"
        return f"{self.placement} — {label}"

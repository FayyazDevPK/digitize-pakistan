from django.contrib import admin

from .models import AdSlot


@admin.register(AdSlot)
class AdSlotAdmin(admin.ModelAdmin):
    list_display = (
        "placement",
        "slot_type",
        "advertiser_name",
        "is_active",
        "impressions",
        "clicks",
    )
    list_filter = ("placement", "slot_type", "is_active")

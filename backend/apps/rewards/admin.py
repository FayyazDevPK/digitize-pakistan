from django.contrib import admin

from .models import RewardRule, RewardsLedgerEntry


@admin.register(RewardRule)
class RewardRuleAdmin(admin.ModelAdmin):
    list_display = ("tier", "type", "rate", "daily_cap", "is_active")
    list_filter = ("tier", "type", "is_active")


@admin.register(RewardsLedgerEntry)
class RewardsLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "amount", "balance_after", "status", "created_at")
    list_filter = ("type", "status")
    readonly_fields = ("created_at",)

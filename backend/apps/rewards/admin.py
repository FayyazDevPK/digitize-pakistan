from django.contrib import admin
from django.utils import timezone

from .models import RewardRule, RewardsLedgerEntry, WithdrawalRequest
from .services import get_balance


@admin.register(RewardRule)
class RewardRuleAdmin(admin.ModelAdmin):
    list_display = ("tier", "type", "rate", "daily_cap", "is_active")
    list_filter = ("tier", "type", "is_active")


@admin.register(RewardsLedgerEntry)
class RewardsLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "amount", "balance_after", "status", "created_at")
    list_filter = ("type", "status")
    readonly_fields = ("created_at",)


@admin.action(description="Mark selected as APPROVED")
def mark_approved(modeladmin, request, queryset):
    queryset.filter(status="REQUESTED").update(status="APPROVED")


@admin.action(description="Mark selected as PAID")
def mark_paid(modeladmin, request, queryset):
    queryset.filter(status="APPROVED").update(status="PAID", processed_at=timezone.now())


@admin.action(description="Reject selected and refund points")
def reject_and_refund(modeladmin, request, queryset):
    for withdrawal in queryset.filter(status__in=["REQUESTED", "APPROVED"]):
        balance = get_balance(withdrawal.user) + withdrawal.points_requested
        RewardsLedgerEntry.objects.create(
            user=withdrawal.user,
            type="ADJUSTMENT",
            amount=withdrawal.points_requested,
            balance_after=balance,
            status="CONFIRMED",
        )
        withdrawal.status = "REJECTED"
        withdrawal.processed_at = timezone.now()
        withdrawal.save(update_fields=["status", "processed_at"])


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ("user", "points_requested", "amount_rs", "method", "status", "requested_at")
    list_filter = ("status", "method")
    actions = [mark_approved, mark_paid, reject_and_refund]

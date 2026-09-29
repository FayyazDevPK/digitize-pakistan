from django import forms
from django.contrib import admin, messages
from django.utils import timezone

from apps.notifications.services import notify

from .models import RewardRule, RewardsLedgerEntry, WithdrawalRequest
from .services import get_balance


@admin.register(RewardRule)
class RewardRuleAdmin(admin.ModelAdmin):
    list_display = ("tier", "type", "rate", "daily_cap", "is_active")
    list_filter = ("tier", "type", "is_active")


class RewardsLedgerEntryAdminForm(forms.ModelForm):
    class Meta:
        model = RewardsLedgerEntry
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("type") == "ADJUSTMENT" and not cleaned.get("note"):
            raise forms.ValidationError(
                {"note": "A note is required for ADJUSTMENT entries, to explain the manual credit/debit."}
            )
        return cleaned


@admin.register(RewardsLedgerEntry)
class RewardsLedgerEntryAdmin(admin.ModelAdmin):
    form = RewardsLedgerEntryAdminForm
    list_display = ("user", "type", "amount", "balance_after", "status", "note", "created_at")
    list_filter = ("type", "status")

    def get_readonly_fields(self, request, obj=None):
        # Ledger entries are financial records: once created, immutable in admin. balance_after
        # is always computed, never typed by hand, on both add and edit.
        if obj is not None:
            return [f.name for f in self.model._meta.fields]
        return ("balance_after",)

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        if not change:
            # Computed here (not left to the caller) so it's never typed by hand and can't drift
            # from the running total -- same rule this project applies to every other balance
            # calculation (see apps/rewards/services.py's row-locked withdrawal path).
            obj.balance_after = get_balance(obj.user) + obj.amount
        super().save_model(request, obj, form, change)


@admin.action(description="Mark selected as APPROVED")
def mark_approved(modeladmin, request, queryset):
    eligible = queryset.filter(status="REQUESTED")
    skipped = queryset.count() - eligible.count()
    for withdrawal in eligible:
        withdrawal.status = "APPROVED"
        withdrawal.save(update_fields=["status"])
        notify(
            withdrawal.user,
            "REWARD",
            "Withdrawal approved",
            f"Your withdrawal of Rs {withdrawal.amount_rs} was approved and will be paid shortly.",
            link="/rewards",
        )
    if skipped:
        modeladmin.message_user(
            request, f"Skipped {skipped} request(s) not in REQUESTED status.", level=messages.WARNING
        )


@admin.action(description="Mark selected as PAID")
def mark_paid(modeladmin, request, queryset):
    eligible = queryset.filter(status="APPROVED")
    skipped = queryset.count() - eligible.count()
    for withdrawal in eligible:
        withdrawal.status = "PAID"
        withdrawal.processed_at = timezone.now()
        withdrawal.processed_by = request.user
        withdrawal.save(update_fields=["status", "processed_at", "processed_by"])
        notify(
            withdrawal.user,
            "REWARD",
            "Withdrawal paid",
            f"Rs {withdrawal.amount_rs} was sent to your {withdrawal.get_method_display()} account.",
            link="/rewards",
        )
    if skipped:
        modeladmin.message_user(
            request,
            f"Skipped {skipped} request(s) not in APPROVED status (cannot mark PAID unless APPROVED).",
            level=messages.WARNING,
        )


@admin.action(description="Reject selected and refund points")
def reject_and_refund(modeladmin, request, queryset):
    eligible = queryset.exclude(status__in=["PAID", "REJECTED"])
    skipped = queryset.count() - eligible.count()
    for withdrawal in eligible:
        balance = get_balance(withdrawal.user) + withdrawal.points_requested
        RewardsLedgerEntry.objects.create(
            user=withdrawal.user,
            type="ADJUSTMENT",
            amount=withdrawal.points_requested,
            balance_after=balance,
            status="CONFIRMED",
            note=f"Refund for rejected withdrawal request #{withdrawal.pk}.",
        )
        withdrawal.status = "REJECTED"
        withdrawal.processed_at = timezone.now()
        withdrawal.processed_by = request.user
        withdrawal.save(update_fields=["status", "processed_at", "processed_by"])
        notify(
            withdrawal.user,
            "REWARD",
            "Withdrawal rejected",
            f"Your withdrawal request was rejected and the {withdrawal.points_requested:.0f} points "
            f"were refunded to your balance.",
            link="/rewards",
        )
    if skipped:
        modeladmin.message_user(
            request,
            f"Skipped {skipped} request(s) already PAID or REJECTED (cannot reject after PAID).",
            level=messages.WARNING,
        )


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "points_requested",
        "amount_rs",
        "method",
        "account_ref",
        "status",
        "requested_at",
        "processed_at",
        "processed_by",
    )
    list_filter = ("status", "method")
    actions = [mark_approved, mark_paid, reject_and_refund]

    def get_readonly_fields(self, request, obj=None):
        # Status (and everything else) changes ONLY via the actions above, which apply the
        # state guards (REQUESTED->APPROVED->PAID, or ->REJECTED before PAID) and stamp
        # processed_at/processed_by -- the change form itself is view-only.
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

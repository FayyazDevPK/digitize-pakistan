from datetime import timedelta

from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils import timezone

from apps.notifications.services import notify

from .models import SubscriptionRequest

PREMIUM_DURATION_DAYS = 30


@admin.action(description="Approve selected requests (upgrades user to Premium for 30 days)")
def approve_subscription(modeladmin, request, queryset):
    for sub in queryset.filter(status="PENDING"):
        sub.status = "APPROVED"
        sub.reviewed_at = timezone.now()
        sub.reviewer = request.user
        sub.save(update_fields=["status", "reviewed_at", "reviewer"])

        user = sub.user
        user.tier = "PREMIUM"
        user.tier_expires_at = timezone.now() + timedelta(days=PREMIUM_DURATION_DAYS)
        user.save(update_fields=["tier", "tier_expires_at"])

        notify(
            user,
            "SUBSCRIPTION",
            "You're now Premium",
            f"Your payment was confirmed — Premium is active until "
            f"{user.tier_expires_at.strftime('%d %b %Y')}.",
            link="/premium",
        )


@admin.action(description="Reject selected requests")
def reject_subscription(modeladmin, request, queryset):
    for sub in queryset.filter(status="PENDING"):
        sub.status = "REJECTED"
        sub.reviewed_at = timezone.now()
        sub.reviewer = request.user
        sub.save(update_fields=["status", "reviewed_at", "reviewer"])

        notify(
            sub.user,
            "SUBSCRIPTION",
            "Your Premium payment could not be confirmed",
            sub.rejection_reason or "Please check the details and submit again.",
            link="/premium",
        )


@admin.register(SubscriptionRequest)
class SubscriptionRequestAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "method",
        "amount_paid",
        "transaction_ref",
        "iban",
        "status",
        "requested_at",
        "reviewed_at",
        "reviewer",
    )
    list_filter = ("status", "method")
    actions = [approve_subscription, reject_subscription]

    def get_readonly_fields(self, request, obj=None):
        # Confirmed during testing: setting status to Approved directly on the form marked the
        # request approved but skipped the real work (upgrading the user's tier, setting an
        # expiry, sending the notification) -- only the actions above do all of that together.
        # Making every field read-only forces status changes through the actions.
        return [f.name for f in self.model._meta.fields] + ["receipt_link"]

    def has_add_permission(self, request):
        return False

    def get_urls(self):
        custom = [
            path(
                "<int:pk>/receipt/",
                self.admin_site.admin_view(self.download_receipt),
                name="subscriptions_subscriptionrequest_receipt",
            )
        ]
        return custom + super().get_urls()

    def download_receipt(self, request, pk):
        # Staff-session gated; receipts are never publicly served.
        if not self.has_view_permission(request):
            raise Http404
        obj = self.get_object(request, str(pk))
        if obj is None or not obj.receipt_file:
            raise Http404
        return FileResponse(obj.receipt_file.open("rb"))

    @admin.display(description="Receipt")
    def receipt_link(self, obj):
        if not obj.receipt_file:
            return "—"
        url = reverse("admin:subscriptions_subscriptionrequest_receipt", args=[obj.pk])
        return format_html('<a href="{}" target="_blank">View receipt</a>', url)

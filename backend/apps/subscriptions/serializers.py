from rest_framework import serializers

from .models import SubscriptionRequest


class SubscriptionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionRequest
        fields = [
            "id",
            "method",
            "transaction_ref",
            "amount_paid",
            "status",
            "requested_at",
            "reviewed_at",
            "rejection_reason",
        ]
        read_only_fields = ["id", "status", "requested_at", "reviewed_at", "rejection_reason"]

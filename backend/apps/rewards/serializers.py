from rest_framework import serializers

from .models import RewardsLedgerEntry, WithdrawalRequest


class RewardsLedgerEntrySerializer(serializers.ModelSerializer):
    source_content_title = serializers.CharField(
        source="source_content.title", read_only=True, default=None
    )

    class Meta:
        model = RewardsLedgerEntry
        fields = [
            "id",
            "type",
            "amount",
            "balance_after",
            "source_content_title",
            "status",
            "created_at",
        ]


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WithdrawalRequest
        fields = [
            "id",
            "points_requested",
            "amount_rs",
            "method",
            "account_ref",
            "status",
            "requested_at",
            "processed_at",
        ]
        read_only_fields = ["amount_rs", "status", "requested_at", "processed_at"]

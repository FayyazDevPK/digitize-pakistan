from rest_framework import serializers

from .models import RewardsLedgerEntry


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

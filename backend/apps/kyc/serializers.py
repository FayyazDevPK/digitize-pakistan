from rest_framework import serializers

from .models import KYCRecord


class KYCRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCRecord
        fields = [
            "id",
            "status",
            "document_type",
            "document_ref_url",
            "submitted_at",
            "reviewed_at",
            "rejection_reason",
        ]
        read_only_fields = ["id", "status", "submitted_at", "reviewed_at", "rejection_reason"]

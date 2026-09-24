from rest_framework import serializers

from .models import KYCRecord


class KYCRecordSerializer(serializers.ModelSerializer):
    has_document_file = serializers.SerializerMethodField()

    class Meta:
        model = KYCRecord
        fields = [
            "id",
            "status",
            "document_type",
            "document_ref_url",
            "document_file",
            "has_document_file",
            "submitted_at",
            "reviewed_at",
            "rejection_reason",
        ]
        read_only_fields = ["id", "status", "submitted_at", "reviewed_at", "rejection_reason"]
        extra_kwargs = {"document_file": {"write_only": True, "required": False}}

    def get_has_document_file(self, obj):
        return bool(obj.document_file)

    def validate(self, attrs):
        if not attrs.get("document_file") and not attrs.get("document_ref_url"):
            raise serializers.ValidationError(
                {"document_file": "Upload a document file (or provide a document link)."}
            )
        return attrs

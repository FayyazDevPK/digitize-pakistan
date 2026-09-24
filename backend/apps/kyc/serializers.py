from rest_framework import serializers

from .models import KYCRecord

REQUIRED_NEW = ("full_name", "cnic_number", "cnic_front", "cnic_back", "selfie")


class KYCRecordSerializer(serializers.ModelSerializer):
    has_legacy_document = serializers.SerializerMethodField()

    class Meta:
        model = KYCRecord
        fields = [
            "id",
            "status",
            "document_type",
            "full_name",
            "cnic_number",
            "cnic_front",
            "cnic_back",
            "selfie",
            "has_legacy_document",
            "submitted_at",
            "reviewed_at",
            "rejection_reason",
        ]
        read_only_fields = ["id", "status", "submitted_at", "reviewed_at", "rejection_reason"]
        # Uploaded images are never echoed back; staff view them through the admin only.
        extra_kwargs = {
            "cnic_front": {"write_only": True, "required": False},
            "cnic_back": {"write_only": True, "required": False},
            "selfie": {"write_only": True, "required": False},
        }

    def get_has_legacy_document(self, obj):
        return bool(obj.document_file or obj.document_ref_url)

    def validate(self, attrs):
        # document_file / document_ref_url are legacy and no longer accepted for new submissions.
        missing = {f: "This field is required." for f in REQUIRED_NEW if not attrs.get(f)}
        if missing:
            raise serializers.ValidationError(missing)
        return attrs

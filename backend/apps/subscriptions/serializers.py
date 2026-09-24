import re

from rest_framework import serializers

from .models import SubscriptionRequest


class SubscriptionRequestSerializer(serializers.ModelSerializer):
    has_receipt = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionRequest
        fields = [
            "id",
            "method",
            "transaction_ref",
            "amount_paid",
            "iban",
            "receipt_file",
            "has_receipt",
            "status",
            "requested_at",
            "reviewed_at",
            "rejection_reason",
        ]
        read_only_fields = ["id", "status", "requested_at", "reviewed_at", "rejection_reason"]
        extra_kwargs = {"receipt_file": {"write_only": True, "required": False}}

    def get_has_receipt(self, obj):
        return bool(obj.receipt_file)

    def validate_iban(self, value):
        value = re.sub(r"\s+", "", value).upper()
        if value and not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{10,30}", value):
            raise serializers.ValidationError("Enter a valid IBAN (e.g. PK36SCBL0000001123456702).")
        return value

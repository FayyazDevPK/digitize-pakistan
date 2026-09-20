from rest_framework import serializers

from .models import AdSlot


class AdSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdSlot
        fields = [
            "id",
            "placement",
            "slot_type",
            "ad_client",
            "ad_slot_id",
            "advertiser_name",
            "image_url",
            "target_url",
        ]

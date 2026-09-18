from rest_framework import serializers

from .models import Referral


class ReferralSerializer(serializers.ModelSerializer):
    referred_username = serializers.CharField(source="referred.username", read_only=True)

    class Meta:
        model = Referral
        fields = ["id", "referred_username", "status", "created_at"]

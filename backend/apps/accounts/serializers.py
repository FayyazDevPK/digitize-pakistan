from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "tier",
            "tier_expires_at",
            "is_verified_badge",
            "kyc_status",
            "display_name",
            "avatar_url",
        ]

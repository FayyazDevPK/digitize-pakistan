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
            "referral_code",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    referral_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "referral_code"]

    def create(self, validated_data):
        referral_code = validated_data.pop("referral_code", "")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)

        referrer = None
        if referral_code:
            referrer = User.objects.filter(referral_code=referral_code.upper()).first()
            if referrer:
                user.referred_by = referrer

        user.save()

        if referrer:
            from apps.referrals.models import Referral

            Referral.objects.get_or_create(referrer=referrer, referred=user)

        return user

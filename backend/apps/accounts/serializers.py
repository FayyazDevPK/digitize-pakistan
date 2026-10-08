import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .email_utils import email_alias_taken, normalize_email
from .models import User


class UserSerializer(serializers.ModelSerializer):
    has_avatar = serializers.SerializerMethodField()

    def get_has_avatar(self, obj):
        return bool(obj.avatar)

    def validate_phone(self, value):
        value = re.sub(r"[\s-]+", "", value)
        if value and not re.fullmatch(r"\+?\d{10,14}", value):
            raise serializers.ValidationError("Enter a valid mobile number, e.g. +923001234471.")
        return value

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
            "avatar",
            "has_avatar",
            "phone",
            "city",
            "email_digests",
            "email_verified",
            "date_joined",
            "password_changed_at",
            "referral_code",
        ]
        extra_kwargs = {"avatar": {"write_only": True, "required": False}}
        read_only_fields = [
            "email_verified",
            "date_joined",
            "password_changed_at",
            "id",
            "username",
            "email",
            "role",
            "tier",
            "tier_expires_at",
            "is_verified_badge",
            "kyc_status",
            "referral_code",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
    referral_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "referral_code"]

    def validate_email(self, value):
        value = value.strip()
        if User.objects.filter(email__iexact=value).exists() or email_alias_taken(value):
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        referral_code = validated_data.pop("referral_code", "")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.password_changed_at = timezone.now()

        referrer = None
        if referral_code:
            referrer = User.objects.filter(referral_code=referral_code.upper()).first()
            if referrer:
                if normalize_email(referrer.email) == normalize_email(user.email):
                    raise serializers.ValidationError(
                        {"referral_code": "You can't use your own referral code."}
                    )
                user.referred_by = referrer

        try:
            user.save()
        except IntegrityError:  # lost a race against a concurrent registration with the same email
            raise serializers.ValidationError({"email": "An account with this email already exists."})
        except DjangoValidationError:  # alias check inside User.save()
            raise serializers.ValidationError({"email": "An account with this email already exists."})

        if referrer:
            from apps.referrals.models import Referral

            Referral.objects.get_or_create(referrer=referrer, referred=user)

        return user


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        validate_password(attrs["new_password"], user=user)
        if attrs["new_password"] == attrs["current_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must differ from the current one."}
            )
        return attrs


class DeactivateAccountSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Incorrect password.")
        return value


class UidTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(UidTokenSerializer):
    new_password = serializers.CharField(write_only=True)

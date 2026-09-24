from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Platform info",
            {
                "fields": (
                    "role",
                    "tier",
                    "tier_expires_at",
                    "is_verified_badge",
                    "kyc_status",
                    "referred_by",
                    "display_name",
                    "avatar_url",
                    "phone",
                    "city",
                    "language",
                    "email_digests",
                )
            },
        ),
    )
    list_display = ("username", "email", "role", "tier", "kyc_status", "is_staff")


admin.site.register(User, UserAdmin)

from rest_framework.permissions import BasePermission


class IsPremiumTier(BasePermission):
    """Allows access only to users on the PREMIUM tier."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.tier == "PREMIUM"
        )


class IsKYCApproved(BasePermission):
    """Allows access only to users with an approved KYC record."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.kyc_status == "APPROVED"
        )


class IsCreator(BasePermission):
    """Allows access only to users with the CREATOR role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "CREATOR"
        )

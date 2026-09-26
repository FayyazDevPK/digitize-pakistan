from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError

from .emails import (
    decode_uid,
    email_verification_token,
    password_reset_token,
    send_password_reset_email,
    send_verification_email,
)
from .models import User
from .serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UidTokenSerializer,
    DeactivateAccountSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    UserSerializer,
)


def revoke_all_sessions(user):
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MeAvatarView(APIView):
    """The signed-in user's own avatar. Never publicly served."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.avatar:
            raise Http404
        return FileResponse(request.user.avatar.open("rb"))


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "password_change"

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at"])

        # Revoke every existing session, then hand this client a fresh pair so it stays signed in.
        revoke_all_sessions(user)
        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


class DeactivateAccountView(APIView):
    """
    Soft-delete: flips is_active off and revokes every refresh token. No related rows
    (KYC, ledger, withdrawals, subscriptions, submissions, notifications) are touched --
    they're retained for compliance.
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = "deactivate"

    def post(self, request):
        serializer = DeactivateAccountSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.is_active = False
        user.save(update_fields=["is_active"])
        revoke_all_sessions(user)
        return Response(status=204)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def perform_create(self, serializer):
        user = serializer.save()
        send_verification_email(user)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "email_verify_confirm"

    def post(self, request):
        data = UidTokenSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = decode_uid(data.validated_data["uid"])
        if user is None or not email_verification_token.check_token(
            user, data.validated_data["token"]
        ):
            return Response(
                {"detail": "This verification link is invalid or has expired."}, status=400
            )
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        return Response({"detail": "Email verified."})


class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "email_verification"

    def post(self, request):
        user = request.user
        if user.email_verified:
            return Response({"detail": "Your email is already verified."})
        if not user.email:
            return Response({"detail": "No email address on file."}, status=400)
        send_verification_email(user)
        return Response({"detail": "Verification email sent."})


PASSWORD_RESET_REQUESTED = {
    "detail": "If an account exists for that email, a reset link has been sent."
}


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        data = PasswordResetRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=data.validated_data["email"].strip(), is_active=True
        ).first()
        if user:
            send_password_reset_email(user)
        # Identical response whether or not the address is registered.
        return Response(PASSWORD_RESET_REQUESTED)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        data = PasswordResetConfirmSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = decode_uid(data.validated_data["uid"])
        if (
            user is None
            or not user.is_active
            or not password_reset_token.check_token(user, data.validated_data["token"])
        ):
            return Response({"detail": "This reset link is invalid or has expired."}, status=400)

        try:
            validate_password(data.validated_data["new_password"], user=user)
        except DjangoValidationError as e:
            raise ValidationError({"new_password": list(e.messages)})

        user.set_password(data.validated_data["new_password"])
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at"])
        # A reset often follows a suspected compromise: sign out everywhere.
        revoke_all_sessions(user)
        return Response({"detail": "Password updated. You can now log in."})


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    Adds request-rate throttling to login, per the full-site security
    audit's finding that login had no brute-force protection at all.
    Uses the same AtomicScopedRateThrottle as the other throttled
    endpoints (apps/accounts/throttles.py).
    """

    throttle_scope = "login"

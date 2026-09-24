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

from .serializers import DeactivateAccountSerializer, PasswordChangeSerializer, RegisterSerializer, UserSerializer


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
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
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
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response(status=204)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "register"


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    Adds request-rate throttling to login, per the full-site security
    audit's finding that login had no brute-force protection at all.
    Uses the same AtomicScopedRateThrottle as the other throttled
    endpoints (apps/accounts/throttles.py).
    """

    throttle_scope = "login"

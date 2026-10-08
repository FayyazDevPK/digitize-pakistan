from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import Content

from .models import RewardsLedgerEntry, WithdrawalRequest
from .serializers import (
    RewardsLedgerEntrySerializer,
    WithdrawalRequestSerializer,
)
from .services import (
    BelowMinimumWithdrawal,
    InsufficientBalance,
    KYCNotApproved,
    get_balance,
    ReadNotEligible,
    ReadNotStarted,
    claim_read,
    get_earned_this_week,
    get_read_reward,
    request_withdrawal,
    start_read,
)


class BalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = RewardsLedgerEntry.objects.filter(user=request.user)[:20]
        return Response(
            {
                "balance": get_balance(request.user),
                "earned_this_week": get_earned_this_week(request.user),
                "recent_entries": RewardsLedgerEntrySerializer(entries, many=True).data,
            }
        )


def _get_content_or_error(request):
    slug = request.data.get("content_slug")
    if not slug:
        return None, Response({"detail": "content_slug is required."}, status=400)
    content = Content.objects.filter(slug=slug).first()
    if content is None:
        return None, Response({"detail": "Content not found."}, status=404)
    return content, None


class ReadStartView(APIView):
    """Records that the user opened an article (the start of the minimum-reading-time clock)."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "read_start"

    def post(self, request):
        content, error = _get_content_or_error(request)
        if error:
            return error
        try:
            session, needed, remaining = start_read(request.user, content)
        except ReadNotEligible as e:
            return Response({"detail": str(e)}, status=403)
        points, cap = get_read_reward(request.user)
        return Response(
            {
                "status": "started",
                "min_seconds": needed,
                "seconds_remaining": remaining,
                "already_rewarded": session.rewarded_at is not None,
                "reward_points": points,
                "daily_cap": cap,
            }
        )


class TriggerReadView(APIView):
    """Claims the read reward: needs a prior start, enough elapsed time, and pays at most once."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "read_engagement"

    def post(self, request):
        content, error = _get_content_or_error(request)
        if error:
            return error
        try:
            result = claim_read(request.user, content)
        except ReadNotEligible as e:
            return Response({"detail": str(e)}, status=403)
        except ReadNotStarted as e:
            return Response({"status": "not_started", "detail": str(e)}, status=400)
        if result["status"] == "too_soon":
            return Response(result, status=400)
        return Response(result)


class WithdrawalView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "withdrawal"

    def get(self, request):
        withdrawals = WithdrawalRequest.objects.filter(user=request.user)
        return Response(WithdrawalRequestSerializer(withdrawals, many=True).data)

    def post(self, request):
        points = request.data.get("points")
        method = request.data.get("method")
        account_ref = request.data.get("account_ref")

        if not points or not method or not account_ref:
            return Response(
                {"detail": "points, method, and account_ref are required."}, status=400
            )

        try:
            withdrawal = request_withdrawal(request.user, points, method, account_ref)
        except KYCNotApproved as e:
            return Response({"detail": str(e)}, status=403)
        except (BelowMinimumWithdrawal, InsufficientBalance) as e:
            return Response({"detail": str(e)}, status=400)

        return Response(WithdrawalRequestSerializer(withdrawal).data, status=201)

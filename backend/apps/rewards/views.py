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
    get_earned_this_week,
    request_withdrawal,
)
from .tasks import award_read_engagement


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


class TriggerReadView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "read_engagement"

    def post(self, request):
        content_slug = request.data.get("content_slug")
        content_id = None
        if content_slug:
            content = Content.objects.filter(slug=content_slug).first()
            content_id = content.id if content else None

        task = award_read_engagement.delay(request.user.id, content_id)
        return Response({"status": "queued", "task_id": task.id})


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

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import Content

from .models import RewardsLedgerEntry
from .serializers import RewardsLedgerEntrySerializer
from .services import get_balance
from .tasks import award_read_engagement


class BalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = RewardsLedgerEntry.objects.filter(user=request.user)[:20]
        return Response(
            {
                "balance": get_balance(request.user),
                "recent_entries": RewardsLedgerEntrySerializer(entries, many=True).data,
            }
        )


class TriggerReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        content_slug = request.data.get("content_slug")
        content_id = None
        if content_slug:
            content = Content.objects.filter(slug=content_slug).first()
            content_id = content.id if content else None

        task = award_read_engagement.delay(request.user.id, content_id)
        return Response({"status": "queued", "task_id": task.id})

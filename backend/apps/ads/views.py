from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdSlot
from .serializers import AdSlotSerializer


class AdSlotListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        placement = request.query_params.get("placement")
        qs = AdSlot.objects.filter(is_active=True)
        if placement:
            qs = qs.filter(placement=placement)

        now = timezone.now()
        results = []
        for slot in qs:
            if slot.slot_type == "DIRECT":
                if slot.starts_at and slot.starts_at > now:
                    continue
                if slot.ends_at and slot.ends_at < now:
                    continue
            results.append(slot)

        AdSlot.objects.filter(id__in=[s.id for s in results]).update(
            impressions=F("impressions") + 1
        )

        return Response(AdSlotSerializer(results, many=True).data)


class AdSlotClickView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        slot = get_object_or_404(AdSlot, pk=pk)
        slot.clicks = F("clicks") + 1
        slot.save(update_fields=["clicks"])
        return Response({"status": "ok"})

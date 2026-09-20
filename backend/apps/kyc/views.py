from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KYCRecord
from .serializers import KYCRecordSerializer


class KYCSubmissionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        record = KYCRecord.objects.filter(user=request.user).order_by("-submitted_at").first()
        if not record:
            return Response(None, status=204)
        return Response(KYCRecordSerializer(record).data)

    def post(self, request):
        existing = KYCRecord.objects.filter(
            user=request.user, status__in=["PENDING", "APPROVED"]
        ).first()
        if existing:
            return Response(
                {"detail": "You already have a submission in review or approved."}, status=400
            )

        serializer = KYCRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(user=request.user)
        return Response(KYCRecordSerializer(record).data, status=201)

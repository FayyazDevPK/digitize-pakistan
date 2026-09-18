from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Referral
from .serializers import ReferralSerializer


class MyReferralsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        referrals = Referral.objects.filter(referrer=request.user).order_by("-created_at")
        return Response(
            {
                "referral_code": request.user.referral_code,
                "referrals": ReferralSerializer(referrals, many=True).data,
            }
        )

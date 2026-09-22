from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SubscriptionRequest
from .serializers import SubscriptionRequestSerializer


class SubscriptionRequestView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "subscription"

    def get(self, request):
        requests = SubscriptionRequest.objects.filter(user=request.user)
        return Response(SubscriptionRequestSerializer(requests, many=True).data)

    def post(self, request):
        existing = SubscriptionRequest.objects.filter(user=request.user, status="PENDING").first()
        if existing:
            return Response(
                {"detail": "You already have a subscription request pending review."}, status=400
            )

        serializer = SubscriptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription_request = serializer.save(user=request.user)
        return Response(SubscriptionRequestSerializer(subscription_request).data, status=201)

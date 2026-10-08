from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rewards.services import award_path_completion_if_earned

from .models import LearningPath, LearningPathProgress, Milestone
from .serializers import LearningPathDetailSerializer, LearningPathListSerializer


class LearningPathListView(ListAPIView):
    queryset = LearningPath.objects.all()
    serializer_class = LearningPathListSerializer
    permission_classes = [AllowAny]


class LearningPathDetailView(RetrieveAPIView):
    queryset = LearningPath.objects.all()
    serializer_class = LearningPathDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class CompleteMilestoneView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug, milestone_id):
        path = get_object_or_404(LearningPath, slug=slug)
        milestone = get_object_or_404(Milestone, id=milestone_id, learning_path=path)

        if not milestone.is_free and path.access_tier == "PREMIUM":
            if request.user.tier != "PREMIUM":
                raise PermissionDenied("This milestone requires a Premium subscription.")

        LearningPathProgress.objects.get_or_create(
            user=request.user, milestone=milestone, learning_path=path
        )
        entry = award_path_completion_if_earned(request.user, path)
        return Response(
            {
                "status": "completed",
                "milestone_id": milestone.id,
                "path_completion_points": entry.amount if entry else None,
            }
        )

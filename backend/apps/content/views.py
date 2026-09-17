from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from .models import Content
from .serializers import ContentDetailSerializer, ContentListSerializer


class ContentListView(ListAPIView):
    serializer_class = ContentListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Content.objects.filter(status="PUBLISHED").order_by("-published_at")
        content_type = self.request.query_params.get("type")
        if content_type:
            qs = qs.filter(type=content_type.upper())
        return qs


class ContentDetailView(RetrieveAPIView):
    serializer_class = ContentDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = Content.objects.filter(status="PUBLISHED")

    def get_object(self):
        obj = super().get_object()
        if obj.visibility == "PREMIUM_ONLY":
            user = self.request.user
            if not (user.is_authenticated and user.tier == "PREMIUM"):
                raise PermissionDenied("This content requires a Premium subscription.")
        return obj

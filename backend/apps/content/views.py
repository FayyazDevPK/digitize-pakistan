from django.db.models import F
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

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

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        # Atomic in-DB increment (no read-modify-write race). Callers that only need the
        # data (e.g. SEO metadata fetches) pass ?count=0 so one page view counts once.
        if request.query_params.get("count") != "0":
            Content.objects.filter(pk=obj.pk).update(view_count=F("view_count") + 1)
            obj.refresh_from_db(fields=["view_count"])
        return Response(self.get_serializer(obj).data)

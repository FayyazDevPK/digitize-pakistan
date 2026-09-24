from django.db.models import F
from django.db.models.functions import Lower
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Category, Content
from .serializers import CategorySerializer, ContentDetailSerializer, ContentListSerializer

SORT_ORDERINGS = {
    "newest": ("-published_at", "-id"),
    "alphabetical": (Lower("title"), "id"),
    "popular": ("-view_count", "-published_at", "-id"),
}


class ContentListView(ListAPIView):
    serializer_class = ContentListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        params = self.request.query_params
        qs = Content.objects.filter(status="PUBLISHED").select_related("category")
        content_type = params.get("type")
        if content_type:
            qs = qs.filter(type=content_type.upper())
        category = params.get("category")
        if category:
            qs = qs.filter(category__slug=category)
        # Unknown/missing sort falls back to newest.
        order = SORT_ORDERINGS.get(params.get("sort", "newest"), SORT_ORDERINGS["newest"])
        return qs.order_by(*order)


class ContentCategoryListView(ListAPIView):
    """Categories that have published content, optionally scoped by ?type=."""

    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        content = Content.objects.filter(status="PUBLISHED")
        content_type = self.request.query_params.get("type")
        if content_type:
            content = content.filter(type=content_type.upper())
        return Category.objects.filter(pk__in=content.values("category_id")).order_by("name")


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

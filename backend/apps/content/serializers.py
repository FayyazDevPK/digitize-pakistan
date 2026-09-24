from rest_framework import serializers

from .models import Category, Content


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent"]


class ContentListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    author_name = serializers.SerializerMethodField()

    def get_author_name(self, obj):
        # Public byline: display name only, falling back to the public username.
        return obj.author.display_name or obj.author.username

    class Meta:
        model = Content
        fields = [
            "id",
            "type",
            "title",
            "slug",
            "excerpt",
            "cover_image_url",
            "category",
            "tags",
            "visibility",
            "published_at",
            "view_count",
            "author_name",
        ]


def _lines(text):
    return [line.strip() for line in text.splitlines() if line.strip()]


class AlternativeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Content
        fields = ["id", "title", "slug", "category"]


class ContentDetailSerializer(ContentListSerializer):
    pros = serializers.SerializerMethodField()
    cons = serializers.SerializerMethodField()
    pricing_lines = serializers.SerializerMethodField()
    alternatives = serializers.SerializerMethodField()

    class Meta(ContentListSerializer.Meta):
        fields = ContentListSerializer.Meta.fields + [
            "body",
            "pros",
            "cons",
            "pricing_lines",
            "alternatives",
        ]

    def get_pros(self, obj):
        return _lines(obj.pros)

    def get_cons(self, obj):
        return _lines(obj.cons)

    def get_pricing_lines(self, obj):
        return _lines(obj.pricing_info)

    def get_alternatives(self, obj):
        qs = obj.alternatives.filter(status="PUBLISHED", type="TOOL_LISTING").select_related(
            "category"
        )
        return AlternativeSerializer(qs, many=True).data

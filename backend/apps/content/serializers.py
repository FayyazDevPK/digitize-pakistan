from rest_framework import serializers

from .models import Category, Content


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent"]


class ContentListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

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
        ]


class ContentDetailSerializer(ContentListSerializer):
    class Meta(ContentListSerializer.Meta):
        fields = ContentListSerializer.Meta.fields + ["body"]

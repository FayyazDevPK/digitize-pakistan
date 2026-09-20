from rest_framework import serializers

from .models import ContentSubmission, CreatorProfile


class CreatorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorProfile
        fields = [
            "id",
            "bio",
            "status",
            "applied_at",
            "approved_at",
            "total_earnings",
            "published_count",
        ]


class ContentSubmissionSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="content.title", read_only=True)
    content_status = serializers.CharField(source="content.status", read_only=True)

    class Meta:
        model = ContentSubmission
        fields = [
            "id",
            "title",
            "content_status",
            "review_status",
            "review_notes",
            "submitted_at",
            "reviewed_at",
        ]

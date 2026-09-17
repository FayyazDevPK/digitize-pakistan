from rest_framework import serializers

from .models import LearningPath, LearningPathProgress, Milestone


class MilestoneSerializer(serializers.ModelSerializer):
    locked = serializers.SerializerMethodField()
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = ["id", "title", "order", "is_free", "locked", "completed"]

    def get_locked(self, obj):
        if obj.is_free:
            return False
        if obj.learning_path.access_tier == "FREE":
            return False
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return not (user and user.is_authenticated and user.tier == "PREMIUM")

    def get_completed(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False
        return LearningPathProgress.objects.filter(user=user, milestone=obj).exists()


class LearningPathListSerializer(serializers.ModelSerializer):
    milestone_count = serializers.IntegerField(source="milestones.count", read_only=True)

    class Meta:
        model = LearningPath
        fields = ["id", "title", "slug", "description", "access_tier", "order", "milestone_count"]


class LearningPathDetailSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)

    class Meta:
        model = LearningPath
        fields = ["id", "title", "slug", "description", "access_tier", "order", "milestones"]

from django.contrib import admin

from .models import LearningPath, LearningPathProgress, Milestone


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 1


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ("title", "access_tier", "order")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [MilestoneInline]


@admin.register(LearningPathProgress)
class LearningPathProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "learning_path", "milestone", "completed_at")
    list_filter = ("learning_path",)

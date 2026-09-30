from django.contrib import admin
from django.utils import timezone

from apps.notifications.services import notify
from apps.rewards.services import RewardCapExceeded, award_points

from .models import ContentSubmission, CreatorProfile


@admin.action(description="Approve selected creator applications")
def approve_creator(modeladmin, request, queryset):
    for profile in queryset.filter(status="APPLIED"):
        profile.status = "APPROVED"
        profile.approved_at = timezone.now()
        profile.save(update_fields=["status", "approved_at"])
        profile.user.role = "CREATOR"
        profile.user.save(update_fields=["role"])
        notify(
            profile.user,
            "CREATOR",
            "Creator Program application approved",
            "You can now submit articles and tutorials for review.",
            link="/creator",
        )


@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "published_count", "total_earnings", "applied_at")
    list_filter = ("status",)
    actions = [approve_creator]


@admin.action(description="Approve selected submissions (publishes content + pays bounty)")
def approve_submission(modeladmin, request, queryset):
    for submission in queryset.filter(review_status__in=["SUBMITTED", "IN_REVIEW"]):
        content = submission.content
        content.status = "PUBLISHED"
        content.published_at = timezone.now()
        content.save(update_fields=["status", "published_at"])

        submission.review_status = "APPROVED"
        submission.reviewer = request.user
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=["review_status", "reviewer", "reviewed_at"])

        profile = submission.creator_profile
        profile.published_count += 1

        try:
            entry = award_points(profile.user, "CREATOR_BOUNTY", source_content=content)
            profile.total_earnings += entry.amount
            notify(
                profile.user,
                "CREATOR",
                "Your submission was published",
                f'"{content.title}" is live — you earned {entry.amount:,.0f} pts.',
                link="/creator",
            )
        except (RewardCapExceeded, ValueError):
            notify(
                profile.user,
                "CREATOR",
                "Your submission was published",
                f'"{content.title}" is now live.',
                link="/creator",
            )

        profile.save(update_fields=["published_count", "total_earnings"])


@admin.action(description="Reject selected submissions")
def reject_submission(modeladmin, request, queryset):
    for submission in queryset.filter(review_status__in=["SUBMITTED", "IN_REVIEW"]):
        submission.review_status = "REJECTED"
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=["review_status", "reviewed_at"])
        notify(
            submission.creator_profile.user,
            "CREATOR",
            "Your submission was not approved",
            f'"{submission.content.title}" was rejected during review.',
            link="/creator",
        )


@admin.register(ContentSubmission)
class ContentSubmissionAdmin(admin.ModelAdmin):
    list_display = ("content", "creator_profile", "review_status", "submitted_at")
    list_filter = ("review_status",)
    actions = [approve_submission, reject_submission]

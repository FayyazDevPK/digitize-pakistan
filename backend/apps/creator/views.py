from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPremiumTier
from apps.content.models import Category, Content

from .models import ContentSubmission, CreatorProfile
from .serializers import ContentSubmissionSerializer, CreatorProfileSerializer


class ApplyView(APIView):
    permission_classes = [IsAuthenticated, IsPremiumTier]

    def post(self, request):
        profile, created = CreatorProfile.objects.get_or_create(user=request.user)
        return Response(
            CreatorProfileSerializer(profile).data, status=201 if created else 200
        )

    def get(self, request):
        try:
            profile = request.user.creator_profile
        except CreatorProfile.DoesNotExist:
            return Response({"detail": "No creator profile."}, status=404)
        return Response(CreatorProfileSerializer(profile).data)


class SubmissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.creator_profile
        except CreatorProfile.DoesNotExist:
            return Response({"detail": "No creator profile."}, status=404)
        submissions = ContentSubmission.objects.filter(creator_profile=profile).order_by(
            "-submitted_at"
        )
        return Response(ContentSubmissionSerializer(submissions, many=True).data)

    def post(self, request):
        if request.user.role != "CREATOR":
            raise PermissionDenied("You must be an approved Creator to submit content.")

        try:
            profile = request.user.creator_profile
        except CreatorProfile.DoesNotExist:
            raise PermissionDenied("No creator profile found.")

        title = request.data.get("title")
        body = request.data.get("body")
        excerpt = request.data.get("excerpt", "")
        category_id = request.data.get("category_id")
        content_type = request.data.get("type", "TUTORIAL")

        if not title or not body or not category_id:
            return Response(
                {"detail": "title, body, and category_id are required."}, status=400
            )

        category = Category.objects.filter(id=category_id).first()
        if not category:
            return Response({"detail": "Invalid category_id."}, status=400)

        base_slug = slugify(title)
        slug = base_slug
        i = 1
        while Content.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{i}"
            i += 1

        content = Content.objects.create(
            author=request.user,
            type=content_type,
            title=title,
            slug=slug,
            body=body,
            excerpt=excerpt,
            category=category,
            visibility="PUBLIC",
            status="IN_REVIEW",
        )

        submission = ContentSubmission.objects.create(
            creator_profile=profile, content=content, review_status="SUBMITTED"
        )

        return Response(ContentSubmissionSerializer(submission).data, status=201)

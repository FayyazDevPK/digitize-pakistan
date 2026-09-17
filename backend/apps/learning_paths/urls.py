from django.urls import path

from .views import CompleteMilestoneView, LearningPathDetailView, LearningPathListView

urlpatterns = [
    path("", LearningPathListView.as_view(), name="learning-path-list"),
    path("<slug:slug>/", LearningPathDetailView.as_view(), name="learning-path-detail"),
    path(
        "<slug:slug>/milestones/<int:milestone_id>/complete/",
        CompleteMilestoneView.as_view(),
        name="milestone-complete",
    ),
]

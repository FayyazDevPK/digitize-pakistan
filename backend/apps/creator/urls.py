from django.urls import path

from .views import ApplyView, SubmissionsView

urlpatterns = [
    path("apply/", ApplyView.as_view(), name="creator-apply"),
    path("submissions/", SubmissionsView.as_view(), name="creator-submissions"),
]

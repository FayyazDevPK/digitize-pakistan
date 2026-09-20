from django.urls import path

from .views import KYCSubmissionView

urlpatterns = [
    path("", KYCSubmissionView.as_view(), name="kyc-submission"),
]

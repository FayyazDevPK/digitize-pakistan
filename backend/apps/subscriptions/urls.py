from django.urls import path

from .views import SubscriptionRequestView

urlpatterns = [
    path("", SubscriptionRequestView.as_view(), name="subscription-requests"),
]

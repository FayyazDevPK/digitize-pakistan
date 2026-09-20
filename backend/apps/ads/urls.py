from django.urls import path

from .views import AdSlotClickView, AdSlotListView

urlpatterns = [
    path("", AdSlotListView.as_view(), name="ad-slot-list"),
    path("<int:pk>/click/", AdSlotClickView.as_view(), name="ad-slot-click"),
]

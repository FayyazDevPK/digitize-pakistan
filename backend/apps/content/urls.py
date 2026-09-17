from django.urls import path

from .views import ContentDetailView, ContentListView

urlpatterns = [
    path("", ContentListView.as_view(), name="content-list"),
    path("<slug:slug>/", ContentDetailView.as_view(), name="content-detail"),
]

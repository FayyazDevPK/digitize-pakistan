from django.urls import path

from .views import ContentCategoryListView, ContentDetailView, ContentListView

urlpatterns = [
    path("", ContentListView.as_view(), name="content-list"),
    path("categories/", ContentCategoryListView.as_view(), name="content-categories"),
    path("<slug:slug>/", ContentDetailView.as_view(), name="content-detail"),
]

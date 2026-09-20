from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.views import MeView, RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/content/", include("apps.content.urls")),
    path("api/learning-paths/", include("apps.learning_paths.urls")),
    path("api/rewards/", include("apps.rewards.urls")),
    path("api/referrals/", include("apps.referrals.urls")),
    path("api/creator/", include("apps.creator.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/ads/", include("apps.ads.urls")),
]

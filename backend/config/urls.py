from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from apps.accounts.views import (
    DeactivateAccountView,
    MeAvatarView,
    MeView,
    PasswordChangeView,
    RegisterView,
    ThrottledTokenObtainPairView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/logout/", TokenBlacklistView.as_view(), name="logout"),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/me/avatar/", MeAvatarView.as_view(), name="me-avatar"),
    path("api/me/deactivate/", DeactivateAccountView.as_view(), name="me-deactivate"),
    path("api/me/password/", PasswordChangeView.as_view(), name="me-password"),
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/content/", include("apps.content.urls")),
    path("api/learning-paths/", include("apps.learning_paths.urls")),
    path("api/rewards/", include("apps.rewards.urls")),
    path("api/referrals/", include("apps.referrals.urls")),
    path("api/creator/", include("apps.creator.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/ads/", include("apps.ads.urls")),
    path("api/kyc/", include("apps.kyc.urls")),
    path("api/subscriptions/", include("apps.subscriptions.urls")),
]

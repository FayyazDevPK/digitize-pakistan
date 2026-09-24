import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def isolated_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    from django.core.cache import cache

    cache.clear()  # locmem is process-wide; don't let throttle counts leak between tests


@pytest.mark.django_db
class TestSettingsProfile:
    def _client(self, **kw):
        from rest_framework.test import APIClient

        user = User.objects.create_user(username="setu", password="Old-pass-123!", **kw)
        c = APIClient()
        c.force_authenticate(user)
        return user, c

    def test_patch_profile_fields_and_readonly_protection(self):
        user, c = self._client()
        res = c.patch(
            "/api/me/",
            {"phone": "+92 300 123-4471", "city": "Karachi", "language": "UR",
             "email_digests": False, "tier": "PREMIUM", "date_joined": "2000-01-01T00:00:00Z"},
            format="json",
        )
        assert res.status_code == 200
        user.refresh_from_db()
        assert (user.phone, user.city, user.language, user.email_digests) == ("+923001234471", "Karachi", "UR", False)
        assert user.tier == "FREE"
        assert user.date_joined.year != 2000

    def test_rejects_bad_phone_and_city(self):
        _, c = self._client()
        assert c.patch("/api/me/", {"phone": "abc"}, format="json").status_code == 400
        assert c.patch("/api/me/", {"city": "Atlantis"}, format="json").status_code == 400

    def test_avatar_upload_and_private_fetch(self, settings, tmp_path):
        import io

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        settings.MEDIA_ROOT = tmp_path
        user, c = self._client()
        assert c.get("/api/me/avatar/").status_code == 404
        buf = io.BytesIO()
        Image.new("RGB", (4, 4), "red").save(buf, "PNG")
        f = SimpleUploadedFile("me-face.png", buf.getvalue(), content_type="image/png")
        res = c.patch("/api/me/", {"avatar": f}, format="multipart")
        assert res.status_code == 200 and res.data["has_avatar"] is True
        assert "avatar" not in res.data
        got = c.get("/api/me/avatar/")
        assert got.status_code == 200 and b"".join(got.streaming_content)[:4] == b"\x89PNG"
        bad = SimpleUploadedFile("x.pdf", b"%PDF", content_type="application/pdf")
        assert c.patch("/api/me/", {"avatar": bad}, format="multipart").status_code == 400

    def test_avatar_endpoint_requires_auth(self):
        from rest_framework.test import APIClient

        assert APIClient().get("/api/me/avatar/").status_code == 401


@pytest.mark.django_db
class TestPasswordChange:
    def _setup(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        user = User.objects.create_user(username="pwuser", password="Old-pass-123!")
        old_refresh = RefreshToken.for_user(user)
        c = APIClient()
        c.force_authenticate(user)
        return user, c, old_refresh

    def test_success_rotates_credentials_and_revokes_old_refresh(self, isolated_cache):
        from rest_framework.test import APIClient

        user, c, old = self._setup()
        res = c.post("/api/me/password/", {"current_password": "Old-pass-123!", "new_password": "Brand-new-pass-456!"}, format="json")
        assert res.status_code == 200 and {"access", "refresh"} <= set(res.data)
        user.refresh_from_db()
        assert user.check_password("Brand-new-pass-456!") and user.password_changed_at is not None
        anon = APIClient()
        assert anon.post("/api/token/refresh/", {"refresh": str(old)}, format="json").status_code == 401
        assert anon.post("/api/token/refresh/", {"refresh": res.data["refresh"]}, format="json").status_code == 200

    def test_wrong_current_weak_and_same_password_rejected(self, isolated_cache):
        user, c, _ = self._setup()
        url = "/api/me/password/"
        assert c.post(url, {"current_password": "nope", "new_password": "Brand-new-pass-456!"}, format="json").status_code == 400
        assert c.post(url, {"current_password": "Old-pass-123!", "new_password": "12345678"}, format="json").status_code == 400
        assert c.post(url, {"current_password": "Old-pass-123!", "new_password": "Old-pass-123!"}, format="json").status_code == 400
        user.refresh_from_db()
        assert user.check_password("Old-pass-123!")

    def test_throttled_after_five_attempts(self, isolated_cache):
        _, c, _ = self._setup()
        codes = [
            c.post("/api/me/password/", {"current_password": "wrong", "new_password": "Brand-new-pass-456!"}, format="json").status_code
            for _ in range(7)
        ]
        assert codes[:5] == [400] * 5 and 429 in codes[5:]


@pytest.mark.django_db
class TestDeactivateAccount:
    def test_deactivate_keeps_related_rows_and_kills_tokens(self, isolated_cache):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        from apps.kyc.models import KYCRecord
        from apps.notifications.models import Notification
        from apps.rewards.models import RewardsLedgerEntry, WithdrawalRequest
        from apps.subscriptions.models import SubscriptionRequest

        user = User.objects.create_user(username="leaver", password="Old-pass-123!")
        KYCRecord.objects.create(user=user, document_type="CNIC", full_name="L", cnic_number="42101-1234567-2")
        SubscriptionRequest.objects.create(user=user, method="JAZZCASH", transaction_ref="T", amount_paid=1)
        Notification.objects.create(user=user, type="SYSTEM", title="t")
        counts = lambda: (
            KYCRecord.objects.filter(user=user).count(), SubscriptionRequest.objects.filter(user=user).count(),
            Notification.objects.filter(user=user).count(), RewardsLedgerEntry.objects.filter(user=user).count(),
            WithdrawalRequest.objects.filter(user=user).count(),
        )
        before = counts()

        refresh = RefreshToken.for_user(user)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        assert c.get("/api/me/").status_code == 200

        assert c.post("/api/me/deactivate/", {"password": "wrong"}, format="json").status_code == 400
        assert User.objects.get(pk=user.pk).is_active is True

        assert c.post("/api/me/deactivate/", {"password": "Old-pass-123!"}, format="json").status_code == 204
        user.refresh_from_db()
        assert user.is_active is False
        assert counts() == before

        assert c.get("/api/me/").status_code == 401  # pre-deactivation access token
        anon = APIClient()
        assert anon.post("/api/token/refresh/", {"refresh": str(refresh)}, format="json").status_code == 401
        assert anon.post("/api/token/", {"username": "leaver", "password": "Old-pass-123!"}, format="json").status_code == 401

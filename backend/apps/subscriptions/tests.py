import io

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.subscriptions.models import SubscriptionRequest

User = get_user_model()


def _png():
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "green").save(buf, "PNG")
    return SimpleUploadedFile("receipt-ayesha.png", buf.getvalue(), content_type="image/png")


@pytest.fixture(autouse=True)
def isolated_cache(settings):
    # Throttle counters must not leak between runs / into the shared dev Redis.
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    from django.core.cache import cache

    cache.clear()  # locmem is process-wide; don't let throttle counts leak between tests


@pytest.fixture
def client():
    user = User.objects.create_user(username="subber", password="x")
    c = APIClient()
    c.force_authenticate(user)
    return user, c


@pytest.mark.django_db
class TestSubscriptionProof:
    def test_multipart_with_iban_and_receipt(self, client, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        user, c = client
        res = c.post(
            "/api/subscriptions/",
            {
                "method": "JAZZCASH",
                "transaction_ref": "TX-1",
                "amount_paid": "950",
                "iban": "pk36 scbl 0000 0011 2345 6702",
                "receipt_file": _png(),
            },
            format="multipart",
        )
        assert res.status_code == 201, res.data
        assert res.data["has_receipt"] is True
        assert "receipt_file" not in res.data
        obj = SubscriptionRequest.objects.get(user=user)
        assert obj.iban == "PK36SCBL0000001123456702"
        assert "ayesha" not in obj.receipt_file.name

    def test_iban_and_receipt_optional(self, client):
        _, c = client
        res = c.post(
            "/api/subscriptions/",
            {"method": "EASYPAISA", "transaction_ref": "TX-2", "amount_paid": "950"},
            format="json",
        )
        assert res.status_code == 201
        assert res.data["has_receipt"] is False

    def test_rejects_bad_iban_and_non_image_receipt(self, client, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, c = client
        base = {"method": "JAZZCASH", "transaction_ref": "TX-3", "amount_paid": "950"}
        assert c.post("/api/subscriptions/", {**base, "iban": "nope"}, format="multipart").status_code == 400
        pdf = SimpleUploadedFile("r.pdf", b"%PDF-1.4", content_type="application/pdf")
        assert c.post("/api/subscriptions/", {**base, "receipt_file": pdf}, format="multipart").status_code == 400


class TestPremiumPriceConstant:
    """apps/subscriptions/admin.py's PREMIUM_PRICE_RS must match frontend/src/lib/premium.ts,
    the same way TestPayoutPolicyConstants keeps payout.ts in sync (apps/rewards/tests.py)."""

    def test_backend_premium_price_matches_frontend_constant(self):
        import re
        from decimal import Decimal
        from pathlib import Path

        from django.conf import settings

        from apps.subscriptions.admin import PREMIUM_PRICE_RS

        src = (Path(settings.BASE_DIR).parent / "frontend/src/lib/premium.ts").read_text()
        m = re.search(r"PREMIUM_PRICE_RS = ([\d_.]+);", src)
        assert m, "PREMIUM_PRICE_RS not found in frontend/src/lib/premium.ts"
        assert Decimal(m.group(1).replace("_", "")) == PREMIUM_PRICE_RS


@pytest.mark.django_db
class TestSubscriptionAdminAmountCheck:
    def _sub(self, amount):
        user = User.objects.create_user(username=f"amtcheck{amount}", password="x")
        return SubscriptionRequest.objects.create(
            user=user, method="EASYPAISA", transaction_ref="TX-1", amount_paid=amount
        )

    def test_matching_amount_shows_check(self):
        from apps.subscriptions.admin import PREMIUM_PRICE_RS, SubscriptionRequestAdmin
        from django.contrib.admin.sites import AdminSite

        admin_instance = SubscriptionRequestAdmin(SubscriptionRequest, AdminSite())
        sub = self._sub(PREMIUM_PRICE_RS)
        html = admin_instance.amount_check(sub)
        assert "matches" in html and "✓" in html

    def test_mismatched_amount_shows_warning(self):
        from apps.subscriptions.admin import SubscriptionRequestAdmin
        from django.contrib.admin.sites import AdminSite

        admin_instance = SubscriptionRequestAdmin(SubscriptionRequest, AdminSite())
        sub = self._sub(500)
        html = admin_instance.amount_check(sub)
        assert "≠" in html and "500" in html

    def test_mismatch_does_not_block_approval(self):
        from apps.subscriptions.admin import approve_subscription
        from django.core.cache import cache

        cache.clear()
        sub = self._sub(1)  # wildly wrong amount

        class FakeRequest:
            def __init__(self, user):
                self.user = user

        class Admin:
            pass

        approve_subscription(Admin(), FakeRequest(sub.user), SubscriptionRequest.objects.filter(pk=sub.pk))
        sub.refresh_from_db()
        assert sub.status == "APPROVED"
        sub.user.refresh_from_db()
        assert sub.user.tier == "PREMIUM"

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

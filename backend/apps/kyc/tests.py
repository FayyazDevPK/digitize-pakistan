import pytest
from django.contrib.auth import get_user_model

from apps.kyc.models import KYCRecord

User = get_user_model()


@pytest.mark.django_db
class TestKYCStatusSync:
    def test_resubmission_after_rejection_updates_denormalized_status(self):
        """
        Regression test for a real bug: User.kyc_status is a denormalized
        field synced by a signal whenever a KYCRecord is saved. The old
        signal only synced to PENDING when the user's prior status was
        NONE, so a user who got REJECTED and then resubmitted had their
        denormalized status stuck at REJECTED forever, even though the
        real latest KYCRecord was genuinely PENDING again. This caused a
        live discrepancy: the Dashboard/sidebar (reading the stale
        denormalized field) showed REJECTED, while /kyc (querying the
        real latest record directly) correctly showed PENDING.
        """
        user = User.objects.create_user(username="kyctestuser", password="x")

        KYCRecord.objects.create(
            user=user,
            document_type="CNIC",
            document_ref_url="https://example.com/doc1.jpg",
            status="REJECTED",
        )
        user.refresh_from_db()
        assert user.kyc_status == "REJECTED"

        # User resubmits after rejection -- this is the exact scenario that
        # was broken.
        KYCRecord.objects.create(
            user=user,
            document_type="CNIC",
            document_ref_url="https://example.com/doc2.jpg",
            status="PENDING",
        )
        user.refresh_from_db()
        assert user.kyc_status == "PENDING"


@pytest.mark.django_db
class TestKYCFileUpload:
    def _client(self, username="uploader"):
        from rest_framework.test import APIClient

        user = User.objects.create_user(username=username, password="x")
        client = APIClient()
        client.force_authenticate(user)
        return user, client

    def test_multipart_upload_stores_file_and_hides_path(self, settings, tmp_path):
        from django.core.files.uploadedfile import SimpleUploadedFile

        settings.MEDIA_ROOT = tmp_path
        user, client = self._client()
        f = SimpleUploadedFile("my-cnic-ayesha.jpg", b"\xff\xd8\xff data", content_type="image/jpeg")
        res = client.post("/api/kyc/", {"document_type": "CNIC", "document_file": f}, format="multipart")
        assert res.status_code == 201
        assert res.data["has_document_file"] is True
        assert "document_file" not in res.data
        record = KYCRecord.objects.get(user=user)
        assert "ayesha" not in record.document_file.name
        assert record.document_file.name.endswith(".jpg")

    def test_rejects_disallowed_extension_and_missing_document(self, settings, tmp_path):
        from django.core.files.uploadedfile import SimpleUploadedFile

        settings.MEDIA_ROOT = tmp_path
        _, client = self._client("uploader2")
        bad = SimpleUploadedFile("x.exe", b"MZ", content_type="application/octet-stream")
        res = client.post("/api/kyc/", {"document_type": "CNIC", "document_file": bad}, format="multipart")
        assert res.status_code == 400
        res = client.post("/api/kyc/", {"document_type": "CNIC"}, format="multipart")
        assert res.status_code == 400

    def test_legacy_url_submission_still_works(self):
        _, client = self._client("uploader3")
        res = client.post(
            "/api/kyc/",
            {"document_type": "CNIC", "document_ref_url": "https://example.com/a.jpg"},
            format="json",
        )
        assert res.status_code == 201
        assert res.data["has_document_file"] is False

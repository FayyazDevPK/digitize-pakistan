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

    def test_deleting_only_record_reverts_status_to_none(self):
        """
        Regression test for a second real bug in the same denormalized
        field: there was no post_delete handler at all, so deleting a
        user's only KYCRecord (e.g. an admin clearing test data) left
        User.kyc_status permanently stuck at the deleted record's status,
        even though no KYCRecord existed anymore.
        """
        user = User.objects.create_user(username="kyctestuser2", password="x")

        record = KYCRecord.objects.create(
            user=user,
            document_type="CNIC",
            document_ref_url="https://example.com/doc1.jpg",
            status="PENDING",
        )
        user.refresh_from_db()
        assert user.kyc_status == "PENDING"

        record.delete()
        user.refresh_from_db()
        assert user.kyc_status == "NONE"

    def test_deleting_newest_record_reverts_to_next_remaining_status(self):
        """
        The delete handler must recompute from the real remaining records,
        not just blindly reset to NONE -- if an older record still exists
        after the newest one is deleted, the denormalized status should
        reflect that older record, not pretend no submission ever happened.
        """
        user = User.objects.create_user(username="kyctestuser3", password="x")

        older = KYCRecord.objects.create(
            user=user,
            document_type="CNIC",
            document_ref_url="https://example.com/doc1.jpg",
            status="REJECTED",
        )
        newer = KYCRecord.objects.create(
            user=user,
            document_type="CNIC",
            document_ref_url="https://example.com/doc2.jpg",
            status="PENDING",
        )
        user.refresh_from_db()
        assert user.kyc_status == "PENDING"

        newer.delete()
        user.refresh_from_db()
        assert user.kyc_status == "REJECTED"


def _png(name="x.png"):
    import io

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


def _payload(**over):
    data = {
        "document_type": "CNIC",
        "full_name": "Ayesha Rahman",
        "cnic_number": "42101-1234567-2",
        "cnic_front": _png("front-ayesha.png"),
        "cnic_back": _png(),
        "selfie": _png(),
    }
    data.update(over)
    return {k: v for k, v in data.items() if v is not None}


@pytest.mark.django_db
class TestKYCFullSubmission:
    def _client(self, username="uploader"):
        from rest_framework.test import APIClient

        user = User.objects.create_user(username=username, password="x")
        client = APIClient()
        client.force_authenticate(user)
        return user, client

    def test_full_submission_stored_and_not_echoed(self, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        user, c = self._client()
        res = c.post("/api/kyc/", _payload(), format="multipart")
        assert res.status_code == 201, res.data
        for f in ("cnic_front", "cnic_back", "selfie"):
            assert f not in res.data
        rec = KYCRecord.objects.get(user=user)
        assert rec.full_name == "Ayesha Rahman" and rec.cnic_number == "42101-1234567-2"
        assert "ayesha" not in rec.cnic_front.name
        assert rec.cnic_front and rec.cnic_back and rec.selfie

    @pytest.mark.parametrize("bad", ["4210112345672", "42101-123456-72", "4210a-1234567-2", "42101-1234567-22", ""])
    def test_invalid_cnic_rejected(self, bad, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, c = self._client("u" + str(abs(hash(bad)) % 10000))
        res = c.post("/api/kyc/", _payload(cnic_number=bad), format="multipart")
        assert res.status_code == 400 and "cnic_number" in res.data

    def test_missing_pieces_and_wrong_type_rejected(self, settings, tmp_path):
        from django.core.files.uploadedfile import SimpleUploadedFile

        settings.MEDIA_ROOT = tmp_path
        _, c = self._client("uploader2")
        res = c.post("/api/kyc/", _payload(selfie=None, full_name=None), format="multipart")
        assert res.status_code == 400 and {"selfie", "full_name"} <= set(res.data)
        pdf = SimpleUploadedFile("a.pdf", b"%PDF", content_type="application/pdf")
        assert c.post("/api/kyc/", _payload(cnic_back=pdf), format="multipart").status_code == 400

    def test_legacy_fields_no_longer_accepted_for_new_submissions(self):
        _, c = self._client("uploader3")
        res = c.post("/api/kyc/", {"document_type": "CNIC", "document_ref_url": "https://e.com/a.jpg"}, format="json")
        assert res.status_code == 400

    def test_legacy_record_still_readable(self):
        user, c = self._client("legacy")
        KYCRecord.objects.create(user=user, document_type="CNIC", document_ref_url="https://e.com/a.jpg")
        res = c.get("/api/kyc/")
        assert res.status_code == 200 and res.data["has_legacy_document"] is True


@pytest.mark.django_db
class TestKYCAdminAutoStamping:
    def test_reviewed_at_stamped_on_transition_to_terminal_status_at_model_level(self):
        user = User.objects.create_user(username="kycadmin1", password="x")
        record = KYCRecord.objects.create(user=user, document_type="CNIC", full_name="A", cnic_number="42101-1234567-2")
        assert record.reviewed_at is None
        record.status = "APPROVED"
        record.save()
        assert record.reviewed_at is not None
        first_stamp = record.reviewed_at
        record.status = "APPROVED"  # no-op transition, shouldn't restamp
        record.save()
        assert record.reviewed_at == first_stamp

    def test_reviewed_by_set_by_admin_save_model_on_terminal_transition(self):
        from django.contrib.admin.sites import AdminSite

        from apps.kyc.admin import KYCRecordAdmin

        class FakeRequest:
            def __init__(self, user):
                self.user = user

        class FakeForm:
            changed_data = ["status"]

        staff = User.objects.create_user(username="kycstaff", password="x", is_staff=True)
        user = User.objects.create_user(username="kycadmin2", password="x")
        record = KYCRecord.objects.create(user=user, document_type="CNIC", full_name="B", cnic_number="42101-1234567-2")
        record.status = "APPROVED"

        admin_instance = KYCRecordAdmin(KYCRecord, AdminSite())
        admin_instance.save_model(FakeRequest(staff), record, FakeForm(), change=True)
        assert record.reviewed_by == staff
        assert record.reviewed_at is not None

    def test_rejection_requires_reason_via_admin_form(self):
        from apps.kyc.admin import KYCRecordAdminForm

        user = User.objects.create_user(username="kycadmin3", password="x")
        record = KYCRecord.objects.create(user=user, document_type="CNIC", full_name="C", cnic_number="42101-1234567-2")
        form = KYCRecordAdminForm(
            data={
                "user": user.pk, "status": "REJECTED", "document_type": "CNIC",
                "full_name": "C", "cnic_number": "42101-1234567-2", "rejection_reason": "",
                "document_ref_url": "", "audit_trail": "[]",
            },
            instance=record,
        )
        assert not form.is_valid()
        assert "rejection_reason" in form.errors

        form_ok = KYCRecordAdminForm(
            data={
                "user": user.pk, "status": "REJECTED", "document_type": "CNIC",
                "full_name": "C", "cnic_number": "42101-1234567-2", "rejection_reason": "Blurry photo",
                "document_ref_url": "", "audit_trail": "[]",
            },
            instance=record,
        )
        assert form_ok.is_valid(), form_ok.errors

    def test_reviewed_fields_are_admin_readonly(self):
        from django.contrib.admin.sites import AdminSite

        from apps.kyc.admin import KYCRecordAdmin

        admin_instance = KYCRecordAdmin(KYCRecord, AdminSite())
        assert {"reviewed_at", "reviewed_by"} <= set(admin_instance.readonly_fields)

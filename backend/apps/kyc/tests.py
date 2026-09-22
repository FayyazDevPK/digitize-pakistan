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

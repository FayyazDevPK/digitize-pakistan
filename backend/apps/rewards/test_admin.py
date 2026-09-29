from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.rewards.admin import mark_approved, mark_paid, reject_and_refund
from apps.rewards.models import RewardsLedgerEntry, WithdrawalRequest
from apps.rewards.services import get_balance

User = get_user_model()


class FakeRequest:
    def __init__(self, user):
        self.user = user


@pytest.fixture
def staff(db):
    return User.objects.create_user(username="staff1", password="x", is_staff=True)


@pytest.fixture
def withdrawer(db):
    user = User.objects.create_user(username="withdrawer", password="x", kyc_status="APPROVED")
    RewardsLedgerEntry.objects.create(user=user, type="READ_ENGAGEMENT", amount=10000, balance_after=10000)
    return user


def _withdrawal(user, status="REQUESTED", **kw):
    return WithdrawalRequest.objects.create(
        user=user, points_requested=8000, amount_rs=2000, method="JAZZCASH",
        account_ref="0300", status=status, **kw,
    )


@pytest.mark.django_db
class TestWithdrawalStateGuards:
    def test_mark_paid_only_applies_to_approved(self, staff, withdrawer):
        requested = _withdrawal(withdrawer, "REQUESTED")
        approved = _withdrawal(withdrawer, "APPROVED")
        qs = WithdrawalRequest.objects.filter(pk__in=[requested.pk, approved.pk])

        class Admin:
            def message_user(self, *a, **k):
                pass

        mark_paid(Admin(), FakeRequest(staff), qs)
        requested.refresh_from_db()
        approved.refresh_from_db()
        assert requested.status == "REQUESTED"  # untouched -- wasn't APPROVED
        assert approved.status == "PAID"
        assert approved.processed_by == staff and approved.processed_at is not None

    def test_mark_approved_only_applies_to_requested(self, staff, withdrawer):
        paid = _withdrawal(withdrawer, "PAID")

        class Admin:
            def message_user(self, *a, **k):
                pass

        mark_approved(Admin(), FakeRequest(staff), WithdrawalRequest.objects.filter(pk=paid.pk))
        paid.refresh_from_db()
        assert paid.status == "PAID"

    def test_cannot_reject_after_paid_and_refund_is_only_issued_for_eligible_ones(self, staff, withdrawer):
        paid = _withdrawal(withdrawer, "PAID", processed_at=None)
        requested = _withdrawal(withdrawer, "REQUESTED")
        before = get_balance(withdrawer)

        class Admin:
            def message_user(self, *a, **k):
                pass

        reject_and_refund(Admin(), FakeRequest(staff), WithdrawalRequest.objects.filter(pk__in=[paid.pk, requested.pk]))
        paid.refresh_from_db()
        requested.refresh_from_db()
        assert paid.status == "PAID"  # never touched
        assert requested.status == "REJECTED"
        assert requested.processed_by == staff
        assert get_balance(withdrawer) == before + requested.points_requested
        refund = RewardsLedgerEntry.objects.filter(user=withdrawer, type="ADJUSTMENT").latest("created_at")
        assert str(requested.pk) in refund.note

    def test_double_reject_does_not_double_refund(self, staff, withdrawer):
        req = _withdrawal(withdrawer, "REQUESTED")
        before = get_balance(withdrawer)

        class Admin:
            def message_user(self, *a, **k):
                pass

        qs = WithdrawalRequest.objects.filter(pk=req.pk)
        reject_and_refund(Admin(), FakeRequest(staff), qs)
        reject_and_refund(Admin(), FakeRequest(staff), qs)  # already REJECTED now -- excluded
        assert get_balance(withdrawer) == before + req.points_requested


@pytest.mark.django_db
class TestWithdrawalAdminReadOnly:
    def test_all_fields_readonly_on_change_form(self, staff):
        from apps.rewards.admin import WithdrawalRequestAdmin
        from django.contrib.admin.sites import AdminSite

        admin_instance = WithdrawalRequestAdmin(WithdrawalRequest, AdminSite())
        fields = admin_instance.get_readonly_fields(FakeRequest(staff))
        assert set(fields) == {f.name for f in WithdrawalRequest._meta.fields}
        assert admin_instance.has_add_permission(FakeRequest(staff)) is False


@pytest.mark.django_db
class TestRewardsLedgerEntryAdmin:
    def test_balance_after_computed_not_trusted_from_input(self, staff):
        from apps.rewards.admin import RewardsLedgerEntryAdmin
        from django.contrib.admin.sites import AdminSite

        user = User.objects.create_user(username="ledgeruser", password="x")
        RewardsLedgerEntry.objects.create(user=user, type="READ_ENGAGEMENT", amount=50, balance_after=50)

        admin_instance = RewardsLedgerEntryAdmin(RewardsLedgerEntry, AdminSite())
        entry = RewardsLedgerEntry(user=user, type="ADJUSTMENT", amount=25, balance_after=Decimal("999999"), note="test credit")
        admin_instance.save_model(FakeRequest(staff), entry, form=None, change=False)
        assert entry.balance_after == Decimal("75.00")

    def test_existing_entries_are_fully_readonly(self, staff):
        from apps.rewards.admin import RewardsLedgerEntryAdmin
        from django.contrib.admin.sites import AdminSite

        user = User.objects.create_user(username="ledgeruser2", password="x")
        entry = RewardsLedgerEntry.objects.create(user=user, type="READ_ENGAGEMENT", amount=50, balance_after=50)
        admin_instance = RewardsLedgerEntryAdmin(RewardsLedgerEntry, AdminSite())
        assert set(admin_instance.get_readonly_fields(FakeRequest(staff), obj=entry)) == {
            f.name for f in RewardsLedgerEntry._meta.fields
        }
        assert admin_instance.get_readonly_fields(FakeRequest(staff), obj=None) == ("balance_after",)
        assert admin_instance.has_delete_permission(FakeRequest(staff)) is False

    def test_adjustment_requires_note(self):
        from apps.rewards.admin import RewardsLedgerEntryAdminForm

        user = User.objects.create_user(username="ledgeruser3", password="x")
        form = RewardsLedgerEntryAdminForm(
            data={"user": user.pk, "type": "ADJUSTMENT", "amount": "10", "balance_after": "10", "status": "CONFIRMED", "note": ""}
        )
        assert not form.is_valid()
        assert "note" in form.errors

        form_ok = RewardsLedgerEntryAdminForm(
            data={"user": user.pk, "type": "ADJUSTMENT", "amount": "10", "balance_after": "10", "status": "CONFIRMED", "note": "manual correction"}
        )
        assert form_ok.is_valid(), form_ok.errors


@pytest.mark.django_db
class TestSubscriptionRequestAdminReadOnly:
    def test_all_fields_readonly_and_no_add(self, staff):
        from apps.subscriptions.admin import SubscriptionRequestAdmin
        from apps.subscriptions.models import SubscriptionRequest
        from django.contrib.admin.sites import AdminSite

        admin_instance = SubscriptionRequestAdmin(SubscriptionRequest, AdminSite())
        fields = admin_instance.get_readonly_fields(FakeRequest(staff))
        assert set(f.name for f in SubscriptionRequest._meta.fields) <= set(fields)
        assert admin_instance.has_add_permission(FakeRequest(staff)) is False

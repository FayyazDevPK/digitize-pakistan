import re
from datetime import datetime, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.emails import email_verification_token, encode_uid, password_reset_token

User = get_user_model()
PW = "Old-pass-123!"


@pytest.fixture(autouse=True)
def isolated_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    from django.core.cache import cache

    cache.clear()


def register(client, username="newbie", email="newbie@example.com", password=PW, **extra):
    return client.post(
        "/api/register/",
        {"username": username, "email": email, "password": password, **extra},
        format="json",
    )


def link_params(mail):
    m = re.search(r"\?uid=([^&\s]+)&token=([^\s]+)", mail.body)
    return {"uid": m.group(1), "token": m.group(2)}


@pytest.mark.django_db
class TestEmailVerification:
    def test_registration_sends_link_and_login_works_unverified(self, mailoutbox):
        c = APIClient()
        assert register(c).status_code == 201
        assert len(mailoutbox) == 1 and mailoutbox[0].to == ["newbie@example.com"]
        assert "/verify-email?uid=" in mailoutbox[0].body
        user = User.objects.get(username="newbie")
        assert user.email_verified is False
        assert c.post("/api/token/", {"username": "newbie", "password": PW}, format="json").status_code == 200

    def test_link_verifies_and_is_single_use(self, mailoutbox):
        c = APIClient()
        register(c)
        params = link_params(mailoutbox[0])
        assert c.post("/api/verify-email/", params, format="json").status_code == 200
        assert User.objects.get(username="newbie").email_verified is True
        assert c.post("/api/verify-email/", params, format="json").status_code == 400

    def test_bad_expired_and_foreign_tokens_rejected(self, mailoutbox, monkeypatch):
        c = APIClient()
        register(c)
        register(c, username="other", email="other@example.com")
        params = link_params(mailoutbox[0])
        assert c.post("/api/verify-email/", {**params, "token": "abc-123"}, format="json").status_code == 400
        other = User.objects.get(username="other")
        assert c.post("/api/verify-email/", {"uid": encode_uid(other), "token": params["token"]}, format="json").status_code == 400
        assert c.post("/api/verify-email/", {"uid": "zzz", "token": params["token"]}, format="json").status_code == 400
        future = datetime.now() + timedelta(hours=49)  # past our 48h limit, inside Django's 3-day ceiling
        monkeypatch.setattr(email_verification_token, "_now", lambda: future)
        assert c.post("/api/verify-email/", params, format="json").status_code == 400
        assert User.objects.get(username="newbie").email_verified is False

    def test_duplicate_email_rejected_case_insensitively(self):
        c = APIClient()
        assert register(c).status_code == 201
        res = register(c, username="second", email="NEWBIE@Example.com")
        assert res.status_code == 400 and "email" in res.data
        assert not User.objects.filter(username="second").exists()

    def test_email_required(self):
        c = APIClient()
        res = c.post("/api/register/", {"username": "noemail", "password": PW}, format="json")
        assert res.status_code == 400 and "email" in res.data

    def test_db_constraint_blocks_duplicates_but_allows_blank(self):
        from django.db import IntegrityError, transaction

        User.objects.create_user(username="a", email="dup@example.com", password="x")
        with pytest.raises(IntegrityError), transaction.atomic():
            User.objects.create_user(username="b", email="DUP@example.com", password="x")
        User.objects.create_user(username="c", password="x")
        User.objects.create_user(username="d", password="x")  # several blank emails are fine

    def test_resend_sends_skips_when_verified_and_is_throttled(self, mailoutbox):
        c = APIClient()
        register(c)
        user = User.objects.get(username="newbie")
        c.force_authenticate(user)
        mailoutbox.clear()
        for _ in range(3):
            assert c.post("/api/verify-email/resend/").status_code == 200
        assert len(mailoutbox) == 3
        assert c.post("/api/verify-email/resend/").status_code == 429
        user.email_verified = True
        user.save()

    def test_resend_noop_when_already_verified(self, mailoutbox):
        user = User.objects.create_user(username="v", email="v@example.com", password="x", email_verified=True)
        c = APIClient()
        c.force_authenticate(user)
        assert c.post("/api/verify-email/resend/").status_code == 200
        assert mailoutbox == []

    def test_mail_failure_does_not_break_registration(self, monkeypatch):
        monkeypatch.setattr("apps.accounts.emails.send_mail", lambda *a, **k: (_ for _ in ()).throw(OSError("smtp down")))
        assert register(APIClient()).status_code == 201


@pytest.mark.django_db
class TestPasswordReset:
    def _user(self):
        return User.objects.create_user(username="resetme", email="reset@example.com", password=PW)

    def test_same_response_for_known_and_unknown_email(self, mailoutbox):
        self._user()
        c = APIClient()
        known = c.post("/api/password-reset/request/", {"email": "reset@example.com"}, format="json")
        unknown = c.post("/api/password-reset/request/", {"email": "ghost@example.com"}, format="json")
        assert known.status_code == unknown.status_code == 200
        assert known.data == unknown.data
        assert len(mailoutbox) == 1 and mailoutbox[0].to == ["reset@example.com"]

    def test_inactive_user_gets_no_email(self, mailoutbox):
        u = self._user()
        u.is_active = False
        u.save()
        assert APIClient().post("/api/password-reset/request/", {"email": u.email}, format="json").status_code == 200
        assert mailoutbox == []

    def test_confirm_changes_password_revokes_sessions_and_is_single_use(self, mailoutbox):
        from rest_framework_simplejwt.tokens import RefreshToken

        user = self._user()
        old_refresh = RefreshToken.for_user(user)
        c = APIClient()
        c.post("/api/password-reset/request/", {"email": user.email}, format="json")
        params = link_params(mailoutbox[0])
        assert "/reset-password?uid=" in mailoutbox[0].body

        res = c.post("/api/password-reset/confirm/", {**params, "new_password": "Brand-new-pass-456!"}, format="json")
        assert res.status_code == 200
        user.refresh_from_db()
        assert user.check_password("Brand-new-pass-456!") and not user.check_password(PW)
        assert c.post("/api/token/", {"username": "resetme", "password": PW}, format="json").status_code == 401
        assert c.post("/api/token/", {"username": "resetme", "password": "Brand-new-pass-456!"}, format="json").status_code == 200
        assert c.post("/api/token/refresh/", {"refresh": str(old_refresh)}, format="json").status_code == 401
        again = c.post("/api/password-reset/confirm/", {**params, "new_password": "Another-pass-789!"}, format="json")
        assert again.status_code == 400

    def test_weak_password_rejected_and_token_still_usable(self, mailoutbox):
        user = self._user()
        c = APIClient()
        c.post("/api/password-reset/request/", {"email": user.email}, format="json")
        params = link_params(mailoutbox[0])
        assert c.post("/api/password-reset/confirm/", {**params, "new_password": "12345678"}, format="json").status_code == 400
        assert c.post("/api/password-reset/confirm/", {**params, "new_password": "Brand-new-pass-456!"}, format="json").status_code == 200

    def test_expired_and_tampered_tokens_rejected(self, mailoutbox, monkeypatch):
        user = self._user()
        c = APIClient()
        c.post("/api/password-reset/request/", {"email": user.email}, format="json")
        params = link_params(mailoutbox[0])
        body = {"new_password": "Brand-new-pass-456!"}
        assert c.post("/api/password-reset/confirm/", {**params, "token": "x-y", **body}, format="json").status_code == 400
        future = datetime.now() + timedelta(hours=2)
        monkeypatch.setattr(password_reset_token, "_now", lambda: future)
        assert c.post("/api/password-reset/confirm/", {**params, **body}, format="json").status_code == 400
        user.refresh_from_db()
        assert user.check_password(PW)

    def test_verification_token_cannot_be_used_for_reset(self):
        user = self._user()
        token = email_verification_token.make_token(user)
        res = APIClient().post(
            "/api/password-reset/confirm/",
            {"uid": encode_uid(user), "token": token, "new_password": "Brand-new-pass-456!"},
            format="json",
        )
        assert res.status_code == 400

    def test_throttled(self):
        c = APIClient()
        codes = [c.post("/api/password-reset/request/", {"email": "x@example.com"}, format="json").status_code for _ in range(7)]
        assert codes[:5] == [200] * 5 and 429 in codes[5:]


@pytest.mark.django_db
class TestVerificationSurvivesMissingRewardRule:
    def test_verification_succeeds_even_if_signup_bonus_rule_is_missing(self, mailoutbox):
        # No SIGNUP_BONUS RewardRule seeded -- award_signup_bonus_once would raise ValueError.
        # Verifying the email itself must still succeed.
        c = APIClient()
        register(c, username="norule", email="norule@example.com")
        params = link_params(mailoutbox[0])
        res = c.post("/api/verify-email/", params, format="json")
        assert res.status_code == 200
        assert User.objects.get(username="norule").email_verified is True

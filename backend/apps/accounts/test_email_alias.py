import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.email_utils import normalize_email

User = get_user_model()
PW = "Str0ng-pass-123!"


def register(email, username, **extra):
    return APIClient().post(
        "/api/register/", {"username": username, "email": email, "password": PW, **extra}, format="json"
    )


@pytest.fixture(autouse=True)
def _cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    from django.core.cache import cache

    cache.clear()


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Foo.Bar+promo@Gmail.com", "foobar@gmail.com"),
        ("f.o.o.b.a.r@googlemail.com", "foobar@gmail.com"),
        ("foo+a+b@gmail.com", "foo@gmail.com"),
        ("First.Last+x@Example.com", "first.last+x@example.com"),  # only gmail is special-cased
        ("  A@B.com ", "a@b.com"),
    ],
)
def test_normalize_email(raw, expected):
    assert normalize_email(raw) == expected


@pytest.mark.django_db
class TestRegistrationAliasUniqueness:
    def test_plus_alias_rejected(self):
        assert register("Farmer@gmail.com", "u1").status_code == 201
        res = register("farmer+2@gmail.com", "u2")
        assert res.status_code == 400 and "email" in res.data

    def test_dot_variants_and_googlemail_rejected(self):
        assert register("far.mer@gmail.com", "u1").status_code == 201
        assert register("farmer@gmail.com", "u2").status_code == 400
        assert register("f.a.r.m.e.r@googlemail.com", "u3").status_code == 400

    def test_email_stored_exactly_as_typed(self):
        assert register("Far.Mer+Tag@Gmail.com", "u1").status_code == 201
        user = User.objects.get(username="u1")
        assert user.email == "Far.Mer+Tag@Gmail.com"
        assert user.email_alias_key == "farmer@gmail.com"

    def test_distinct_gmail_and_non_gmail_still_allowed(self):
        assert register("one@gmail.com", "u1").status_code == 201
        assert register("two@gmail.com", "u2").status_code == 201
        assert register("one+a@example.com", "u3").status_code == 201
        assert register("one+b@example.com", "u4").status_code == 201  # + is only ignored for gmail

    def test_existing_legacy_account_is_matched_but_not_modified(self):
        legacy = User.objects.create_user(username="old", email="x@example.com", password="x")
        User.objects.filter(pk=legacy.pk).update(email="Old.Timer@gmail.com", email_alias_key=None)
        assert register("oldtimer+new@gmail.com", "new").status_code == 400
        legacy.refresh_from_db()
        assert legacy.email == "Old.Timer@gmail.com" and legacy.email_alias_key is None
        legacy.first_name = "Edited"
        legacy.save()  # saving other fields on a legacy account is not blocked
        assert register("fresh@gmail.com", "fresh").status_code == 201

    def test_email_change_enforced(self):
        a = User.objects.create_user(username="a", email="a@gmail.com", password="x")
        b = User.objects.create_user(username="b", email="b@gmail.com", password="x")
        b.email = "a+b@gmail.com"
        with pytest.raises(ValidationError):
            b.full_clean(exclude=["password", "username"])
        with pytest.raises(ValidationError):
            b.save()
        b.refresh_from_db()
        assert b.email == "b@gmail.com"
        a.email = "A@GMAIL.COM"  # an account's own alias is not a conflict with itself
        a.save()
        b.email = "b2@gmail.com"
        b.save()
        assert User.objects.get(pk=b.pk).email_alias_key == "b2@gmail.com"


@pytest.mark.django_db
class TestSelfReferral:
    def test_register_with_own_alias_and_code_rejected(self):
        referrer = User.objects.create_user(username="ref", email="ref@gmail.com", password="x")
        res = register("ref+me@gmail.com", "me", referral_code=referrer.referral_code)
        assert res.status_code == 400
        assert not User.objects.filter(username="me").exists()

    def test_legit_referral_still_works(self):
        referrer = User.objects.create_user(username="ref", email="ref@gmail.com", password="x")
        res = register("friend@gmail.com", "friend", referral_code=referrer.referral_code)
        assert res.status_code == 201
        assert User.objects.get(username="friend").referred_by == referrer

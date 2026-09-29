import time

import pytest
from django.contrib.auth import get_user_model
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, APIClient

from apps.accounts.throttles import AtomicScopedRateThrottle

User = get_user_model()


class ScopedView:
    throttle_scope = "test_scope"


class UnscopedView:
    pass


@pytest.fixture(autouse=True)
def isolated_cache(settings, monkeypatch):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    # AtomicScopedRateThrottle.THROTTLE_RATES is a class attribute snapshotted from
    # api_settings at import time, so a settings.REST_FRAMEWORK override alone won't add a
    # new scope to it -- patch the dict directly instead.
    monkeypatch.setitem(AtomicScopedRateThrottle.THROTTLE_RATES, "test_scope", "2/min")
    from django.core.cache import cache

    cache.clear()


def _request(method, user=None, ip="1.2.3.4"):
    factory = APIRequestFactory()
    django_request = getattr(factory, method.lower())("/x", REMOTE_ADDR=ip)
    request = Request(django_request)
    if user is not None:
        request.user = user
        request._authenticator = object()  # request.user.is_authenticated only needs a real user
    else:
        from django.contrib.auth.models import AnonymousUser

        request.user = AnonymousUser()
    return request


@pytest.mark.django_db
class TestAtomicScopedRateThrottleKeying:
    def test_two_authenticated_users_same_ip_get_separate_quotas(self):
        a = User.objects.create_user(username="a", password="x")
        b = User.objects.create_user(username="b", password="x")
        t1, t2 = AtomicScopedRateThrottle(), AtomicScopedRateThrottle()

        # Same IP for both -- if keyed by IP alone these would share one 2/min quota.
        assert t1.allow_request(_request("POST", user=a, ip="9.9.9.9"), ScopedView())
        assert t1.allow_request(_request("POST", user=a, ip="9.9.9.9"), ScopedView())
        assert not t1.allow_request(_request("POST", user=a, ip="9.9.9.9"), ScopedView())

        assert t2.allow_request(_request("POST", user=b, ip="9.9.9.9"), ScopedView())
        assert t2.allow_request(_request("POST", user=b, ip="9.9.9.9"), ScopedView())

    def test_anonymous_requests_keyed_by_ip(self):
        t1, t2 = AtomicScopedRateThrottle(), AtomicScopedRateThrottle()
        assert t1.allow_request(_request("POST", ip="1.1.1.1"), ScopedView())
        assert t1.allow_request(_request("POST", ip="1.1.1.1"), ScopedView())
        assert not t1.allow_request(_request("POST", ip="1.1.1.1"), ScopedView())
        # Different anonymous IP: separate quota.
        assert t2.allow_request(_request("POST", ip="2.2.2.2"), ScopedView())

    def test_unscoped_view_and_missing_rate_are_not_throttled(self, settings):
        t = AtomicScopedRateThrottle()
        assert t.allow_request(_request("POST"), UnscopedView())

        class NoRateView:
            throttle_scope = "no_such_scope_configured"

        # An unconfigured scope is a config error DRF surfaces loudly, not a silent pass.
        from django.core.exceptions import ImproperlyConfigured

        with pytest.raises(ImproperlyConfigured):
            AtomicScopedRateThrottle().allow_request(_request("POST"), NoRateView())


@pytest.mark.django_db
class TestSafeMethodsDontConsumeQuota:
    def test_get_head_options_never_throttled_and_dont_burn_quota(self):
        t = AtomicScopedRateThrottle()
        for _ in range(10):
            assert t.allow_request(_request("GET", ip="5.5.5.5"), ScopedView())
        for _ in range(10):
            assert t.allow_request(_request("HEAD", ip="5.5.5.5"), ScopedView())
        for _ in range(10):
            assert t.allow_request(_request("OPTIONS", ip="5.5.5.5"), ScopedView())
        # The write quota (2/min) is still fully available -- GETs above didn't touch it.
        t2 = AtomicScopedRateThrottle()
        assert t2.allow_request(_request("POST", ip="5.5.5.5"), ScopedView())
        assert t2.allow_request(_request("POST", ip="5.5.5.5"), ScopedView())
        assert not t2.allow_request(_request("POST", ip="5.5.5.5"), ScopedView())

    def test_withdrawal_and_subscription_views_dont_throttle_get(self, settings):
        settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
        user = User.objects.create_user(username="listuser", password="x", kyc_status="APPROVED")
        client = APIClient()
        client.force_authenticate(user)
        for _ in range(10):
            assert client.get("/api/rewards/withdrawals/").status_code == 200
        for _ in range(10):
            assert client.get("/api/subscriptions/").status_code == 200


@pytest.mark.django_db
class TestWaitReturnsRemainingTime:
    def test_wait_is_bounded_by_duration_not_always_full_duration(self, monkeypatch):
        t = AtomicScopedRateThrottle()
        fixed_now = 1_700_000_000.4  # arbitrary, deterministic
        monkeypatch.setattr(time, "time", lambda: fixed_now)

        assert t.allow_request(_request("POST", ip="7.7.7.7"), ScopedView())
        assert t.allow_request(_request("POST", ip="7.7.7.7"), ScopedView())
        assert not t.allow_request(_request("POST", ip="7.7.7.7"), ScopedView())

        window_end = (t.window + 1) * t.duration
        expected = window_end - fixed_now
        assert 0 < t.wait() <= t.duration
        assert t.wait() == pytest.approx(expected)

    def test_wait_never_negative_at_window_boundary(self, monkeypatch):
        t = AtomicScopedRateThrottle()
        t.allow_request(_request("POST", ip="8.8.8.8"), ScopedView())
        t.allow_request(_request("POST", ip="8.8.8.8"), ScopedView())
        t.allow_request(_request("POST", ip="8.8.8.8"), ScopedView())  # sets self.window/duration
        window_end = (t.window + 1) * t.duration
        monkeypatch.setattr(time, "time", lambda: window_end + 5)  # pretend time has moved on
        assert t.wait() == 0.0

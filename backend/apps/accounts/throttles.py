import time

from rest_framework.permissions import SAFE_METHODS
from rest_framework.throttling import ScopedRateThrottle


class AtomicScopedRateThrottle(ScopedRateThrottle):
    """
    DRF's default throttle implementations do a read-then-write against
    the cache (read request history, check it, write it back) -- not an
    atomic operation. Under genuine concurrent requests, many can all
    read the same "before" state and all pass the check together.
    Confirmed via Phase 10 load testing: the default ScopedRateThrottle
    let 50 concurrent requests through a 20/min limit with zero
    rejections.

    This uses a fixed-window counter with cache.add() + cache.incr(),
    both atomic at the Redis level, to close that gap. Trade-off: a
    fixed window (not DRF's default sliding window) can allow up to
    ~2x the rate right at a window boundary -- an acceptable trade for
    an atomic guarantee on an endpoint where the real fraud-prevention
    boundary is the daily point cap (see apps/rewards/services.py),
    not this request-rate limit.

    Fixed during the 2026-09-29 smoke test:
    - The cache key used only get_ident() (client IP) for every request, so two
      different logged-in users behind the same IP/NAT shared one quota. Now matches
      DRF's own ScopedRateThrottle.get_cache_key semantics: authenticated requests are
      keyed by user pk, anonymous ones by IP.
    - GET/HEAD/OPTIONS never consume the quota. Some views (WithdrawalView,
      SubscriptionRequestView) serve both a GET (list/history) and a POST (the actual
      write being rate-limited) under one throttle_scope; before this, every page load
      of the history spent one unit of the write quota.
    - wait() returned the full window duration regardless of when in the window the
      request landed, so a client throttled 1 second before the window rolls over was
      told to wait the full period. Now returns the seconds actually left.
    """

    def allow_request(self, request, view):
        if not getattr(view, "throttle_scope", None):
            return True
        if request.method in SAFE_METHODS:
            return True

        self.scope = view.throttle_scope
        self.rate = self.get_rate()
        if self.rate is None:
            return True

        self.num_requests, self.duration = self.parse_rate(self.rate)

        ident = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)
        self.window = int(time.time() // self.duration)
        self.key = f"athrottle_{self.scope}_{ident}_{self.window}"

        self.cache.add(self.key, 0, self.duration)
        count = self.cache.incr(self.key, 1)

        return count <= self.num_requests

    def wait(self):
        window_end = (self.window + 1) * self.duration
        return max(0.0, window_end - time.time())

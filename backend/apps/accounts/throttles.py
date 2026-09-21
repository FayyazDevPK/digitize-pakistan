import time

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
    """

    def allow_request(self, request, view):
        if not getattr(view, "throttle_scope", None):
            return True

        self.scope = view.throttle_scope
        self.rate = self.get_rate()
        if self.rate is None:
            return True

        self.num_requests, self.duration = self.parse_rate(self.rate)

        ident = self.get_ident(request)
        window = int(time.time() // self.duration)
        self.key = f"athrottle_{self.scope}_{ident}_{window}"

        self.cache.add(self.key, 0, self.duration)
        count = self.cache.incr(self.key, 1)

        return count <= self.num_requests

    def wait(self):
        return float(self.duration)

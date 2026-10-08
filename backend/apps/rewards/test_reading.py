from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.content.models import Category, Content
from apps.rewards.models import ReadSession, RewardRule, RewardsLedgerEntry
from apps.rewards.services import (
    MAX_READ_SECONDS,
    MIN_READ_SECONDS,
    get_balance,
    min_read_seconds,
)

User = get_user_model()


@pytest.fixture(autouse=True)
def clean(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def rules(db):
    RewardRule.objects.create(tier="FREE", type="READ_ENGAGEMENT", rate=Decimal("5"), daily_cap=Decimal("25"))
    RewardRule.objects.create(tier="PREMIUM", type="READ_ENGAGEMENT", rate=Decimal("10"), daily_cap=Decimal("100"))


def make_article(slug, words=50, type="NEWS", status="PUBLISHED", visibility="PUBLIC"):
    author = User.objects.get_or_create(username="author")[0]
    cat = Category.objects.get_or_create(slug="c", defaults={"name": "C"})[0]
    return Content.objects.create(
        author=author, type=type, title=slug, slug=slug, body=" ".join(["word"] * words),
        category=cat, status=status, visibility=visibility,
    )


def client_for(tier="FREE", name="reader"):
    user = User.objects.create_user(username=name, password="x", tier=tier)
    c = APIClient()
    c.force_authenticate(user)
    return user, c


def age_session(user, content, seconds):
    ReadSession.objects.filter(user=user, content=content).update(
        started_at=timezone.now() - timedelta(seconds=seconds)
    )


def start(c, slug):
    return c.post("/api/rewards/read/start/", {"content_slug": slug}, format="json")


def claim(c, slug):
    return c.post("/api/rewards/read/", {"content_slug": slug}, format="json")


@pytest.mark.django_db
class TestMinimumReadTime:
    def test_scales_with_length_within_bounds(self):
        assert min_read_seconds(make_article("short", words=10)) == MIN_READ_SECONDS
        assert min_read_seconds(make_article("mid", words=1000)) == 150
        assert min_read_seconds(make_article("long", words=20000)) == MAX_READ_SECONDS


@pytest.mark.django_db
class TestClaimFlow:
    def test_claim_without_start_rejected(self, rules):
        make_article("a")
        user, c = client_for()
        res = claim(c, "a")
        assert res.status_code == 400 and res.data["status"] == "not_started"
        assert get_balance(user) == 0

    def test_instant_claim_rejected_and_pays_nothing(self, rules):
        art = make_article("a")
        user, c = client_for()
        assert start(c, "a").status_code == 200
        res = claim(c, "a")
        assert res.status_code == 400 and res.data["status"] == "too_soon"
        assert 0 < res.data["seconds_remaining"] <= MIN_READ_SECONDS
        assert get_balance(user) == 0

    def test_claim_after_minimum_time_pays_tier_rate(self, rules):
        art = make_article("a")
        user, c = client_for("FREE")
        start(c, "a"); age_session(user, art, MIN_READ_SECONDS + 1)
        res = claim(c, "a")
        assert res.status_code == 200 and res.data["status"] == "awarded"
        assert Decimal(res.data["points"]) == 5 and get_balance(user) == 5
        ledger = RewardsLedgerEntry.objects.get(user=user)
        assert ledger.type == "READ_ENGAGEMENT" and ledger.source_content == art

        puser, pc = client_for("PREMIUM", "premreader")
        start(pc, "a"); age_session(puser, art, 60)
        assert Decimal(claim(pc, "a").data["points"]) == 10

    def test_start_reports_real_reward_values(self, rules):
        make_article("a")
        _, c = client_for("PREMIUM")
        data = start(c, "a").data
        assert Decimal(data["reward_points"]) == 10 and Decimal(data["daily_cap"]) == 100
        assert data["min_seconds"] == MIN_READ_SECONDS and data["already_rewarded"] is False

    def test_second_claim_for_same_article_pays_nothing(self, rules):
        art = make_article("a")
        user, c = client_for()
        start(c, "a"); age_session(user, art, 60)
        assert claim(c, "a").data["status"] == "awarded"
        assert claim(c, "a").data["status"] == "already_claimed"
        start(c, "a")  # re-opening must not reset anything
        assert start(c, "a").data["already_rewarded"] is True
        assert claim(c, "a").data["status"] == "already_claimed"
        assert get_balance(user) == 5

    def test_reopening_does_not_reset_the_clock(self, rules):
        art = make_article("a")
        user, c = client_for()
        start(c, "a"); age_session(user, art, 60)
        start(c, "a")
        assert claim(c, "a").data["status"] == "awarded"

    def test_daily_cap_blocks_extra_articles_and_read_is_payable_later(self, rules):
        user, c = client_for()
        arts = [make_article(f"a{i}") for i in range(6)]
        for a in arts:
            start(c, a.slug); age_session(user, a, 60)
        statuses = [claim(c, a.slug).data["status"] for a in arts]
        assert statuses == ["awarded"] * 5 + ["cap_reached"]
        assert get_balance(user) == 25
        last = ReadSession.objects.get(user=user, content=arts[5])
        assert last.completed_at is not None and last.rewarded_at is None
        cache.clear()  # next day
        assert claim(c, arts[5].slug).data["status"] == "awarded"
        assert get_balance(user) == 30

    def test_ineligible_content_rejected(self, rules):
        user, c = client_for()
        make_article("tool", type="TOOL_LISTING")
        make_article("draft", status="DRAFT")
        make_article("prem", type="GUIDE", visibility="PREMIUM_ONLY")
        for slug in ("tool", "draft", "prem"):
            assert start(c, slug).status_code == 403
            assert claim(c, slug).status_code == 403
        assert get_balance(user) == 0

    def test_premium_only_content_readable_by_premium(self, rules):
        art = make_article("prem", type="GUIDE", visibility="PREMIUM_ONLY")
        user, c = client_for("PREMIUM")
        assert start(c, "prem").status_code == 200
        age_session(user, art, 60)
        assert claim(c, "prem").data["status"] == "awarded"

    def test_requires_slug_login_and_existing_content(self, rules):
        _, c = client_for()
        assert c.post("/api/rewards/read/", {}, format="json").status_code == 400
        assert claim(c, "nope").status_code == 404
        assert claim(APIClient(), "a").status_code == 401
        assert start(APIClient(), "a").status_code == 401

    def test_claims_are_throttled(self, rules):
        art = make_article("a")
        user, c = client_for()
        start(c, "a"); age_session(user, art, 60)
        codes = [claim(c, "a").status_code for _ in range(22)]
        assert 429 in codes

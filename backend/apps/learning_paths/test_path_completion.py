from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.content.models import Category, Content
from apps.learning_paths.models import LearningPath, LearningPathProgress, Milestone, PathCompletionAward
from apps.notifications.models import Notification
from apps.rewards.models import ReadSession, RewardRule, RewardsLedgerEntry
from apps.rewards.services import award_path_completion_if_earned, get_balance, get_earned_this_week

User = get_user_model()


@pytest.fixture(autouse=True)
def clean(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def rule(db):
    RewardRule.objects.create(tier="FREE", type="LEARNING_PATH_COMPLETION", rate=Decimal("500"))
    RewardRule.objects.create(tier="PREMIUM", type="LEARNING_PATH_COMPLETION", rate=Decimal("500"))


def make_path(n=2, linked=True, slug="p"):
    author = User.objects.get_or_create(username="author")[0]
    cat = Category.objects.get_or_create(slug="c", defaults={"name": "C"})[0]
    path = LearningPath.objects.create(title="Path", slug=slug)
    for i in range(n):
        content = None
        if linked:
            content = Content.objects.create(
                author=author, type="TUTORIAL", title=f"{slug}-l{i}", slug=f"{slug}-l{i}", body="x",
                category=cat, status="PUBLISHED",
            )
        Milestone.objects.create(learning_path=path, title=f"M{i}", order=i, content=content, is_free=True)
    return path


def read(user, path):
    for m in path.milestones.all():
        ReadSession.objects.update_or_create(
            user=user, content=m.content, defaults={"completed_at": timezone.now()}
        )


def complete_all(client, path):
    last = None
    for m in path.milestones.all():
        last = client.post(f"/api/learning-paths/{path.slug}/milestones/{m.id}/complete/")
    return last


@pytest.fixture
def user_client(db):
    user = User.objects.create_user(username="learner", password="x")
    c = APIClient()
    c.force_authenticate(user)
    return user, c


@pytest.mark.django_db
class TestPathCompletionReward:
    def test_pays_500_once_when_all_milestones_done_and_all_lessons_read(self, rule, user_client):
        user, c = user_client
        path = make_path(3)
        read(user, path)
        res = complete_all(c, path)
        assert Decimal(res.data["path_completion_points"]) == 500
        assert get_balance(user) == 500
        entry = RewardsLedgerEntry.objects.get(user=user)
        assert entry.type == "LEARNING_PATH_COMPLETION" and "Path" in entry.note
        assert Notification.objects.filter(user=user, title="Learning path completed").count() == 1
        assert get_earned_this_week(user) == 500  # counts as earnings

    def test_never_pays_twice(self, rule, user_client):
        user, c = user_client
        path = make_path(2)
        read(user, path)
        complete_all(c, path)
        for _ in range(3):
            res = complete_all(c, path)
            assert res.data["path_completion_points"] is None
        assert award_path_completion_if_earned(user, path) is None
        assert get_balance(user) == 500
        assert PathCompletionAward.objects.filter(user=user, learning_path=path).count() == 1

    def test_clicking_complete_without_reading_never_pays(self, rule, user_client):
        user, c = user_client
        path = make_path(3)
        res = complete_all(c, path)
        assert res.data["path_completion_points"] is None
        assert get_balance(user) == 0

    def test_started_but_not_completed_reads_dont_count(self, rule, user_client):
        user, c = user_client
        path = make_path(2)
        for m in path.milestones.all():
            ReadSession.objects.create(user=user, content=m.content)  # opened only
        complete_all(c, path)
        assert get_balance(user) == 0

    def test_partial_reads_dont_pay_then_finishing_reads_does(self, rule, user_client):
        user, c = user_client
        path = make_path(3)
        first = path.milestones.first()
        ReadSession.objects.create(user=user, content=first.content, completed_at=timezone.now())
        assert complete_all(c, path).data["path_completion_points"] is None
        read(user, path)
        res = c.post(f"/api/learning-paths/{path.slug}/milestones/{first.id}/complete/")
        assert Decimal(res.data["path_completion_points"]) == 500

    def test_not_all_milestones_completed_never_pays(self, rule, user_client):
        user, c = user_client
        path = make_path(3)
        read(user, path)
        ms = list(path.milestones.all())
        for m in ms[:2]:
            c.post(f"/api/learning-paths/{path.slug}/milestones/{m.id}/complete/")
        assert get_balance(user) == 0

    def test_path_with_unlinked_milestone_cannot_pay(self, rule, user_client):
        user, c = user_client
        path = make_path(2, linked=False)
        res = complete_all(c, path)
        assert res.data["path_completion_points"] is None
        assert get_balance(user) == 0

    def test_reads_of_other_users_dont_count(self, rule, user_client):
        user, c = user_client
        other = User.objects.create_user(username="other", password="x")
        path = make_path(2)
        read(other, path)
        complete_all(c, path)
        assert get_balance(user) == 0

    def test_each_path_pays_separately(self, rule, user_client):
        user, c = user_client
        p1, p2 = make_path(1, slug="p1"), make_path(1, slug="p2")
        read(user, p1); read(user, p2)
        complete_all(c, p1); complete_all(c, p2)
        assert get_balance(user) == 1000

    def test_missing_rule_does_not_break_milestone_completion_and_can_pay_later(self, user_client):
        user, c = user_client
        path = make_path(1)
        read(user, path)
        res = complete_all(c, path)
        assert res.status_code == 200 and res.data["path_completion_points"] is None
        assert LearningPathProgress.objects.filter(user=user).count() == 1
        assert not PathCompletionAward.objects.exists()
        RewardRule.objects.create(tier="FREE", type="LEARNING_PATH_COMPLETION", rate=Decimal("500"))
        res = complete_all(c, path)
        assert Decimal(res.data["path_completion_points"]) == 500

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestToolDetailAndViewCount:
    def _tool(self, slug, **kw):
        from apps.content.models import Category, Content

        author = User.objects.get_or_create(username="author1")[0]
        cat = Category.objects.get_or_create(slug="voice", defaults={"name": "Voice"})[0]
        return Content.objects.create(
            author=author, type="TOOL_LISTING", title=slug, slug=slug, body="b", category=cat,
            status="PUBLISHED", **kw,
        )

    def test_detail_fetch_increments_and_returns_new_count(self):
        from rest_framework.test import APIClient

        tool = self._tool("t1")
        c = APIClient()
        assert c.get("/api/content/t1/").data["view_count"] == 1
        assert c.get("/api/content/t1/").data["view_count"] == 2
        tool.refresh_from_db()
        assert tool.view_count == 2

    def test_count_zero_param_does_not_increment(self):
        from rest_framework.test import APIClient

        tool = self._tool("t2")
        APIClient().get("/api/content/t2/?count=0")
        tool.refresh_from_db()
        assert tool.view_count == 0

    def test_premium_denied_does_not_count(self):
        from rest_framework.test import APIClient

        tool = self._tool("t3", visibility="PREMIUM_ONLY")
        assert APIClient().get("/api/content/t3/").status_code == 403
        tool.refresh_from_db()
        assert tool.view_count == 0

    def test_pros_cons_pricing_alternatives_serialised(self):
        from rest_framework.test import APIClient

        a = self._tool("a", pros="one\n\n two ", cons="x", pricing_info="Free\nPaid")
        b = self._tool("b")
        draft = self._tool("c")
        draft.status = "DRAFT"
        draft.save()
        a.alternatives.set([b, draft])
        data = APIClient().get("/api/content/a/").data
        assert data["pros"] == ["one", "two"]
        assert data["cons"] == ["x"]
        assert data["pricing_lines"] == ["Free", "Paid"]
        assert [x["slug"] for x in data["alternatives"]] == ["b"]


@pytest.mark.django_db
class TestContentListFilterSort:
    def _mk(self, slug, title, cat, views, days_ago, type="TOOL_LISTING"):
        from datetime import timedelta

        from django.utils import timezone

        from apps.content.models import Category, Content

        author = User.objects.get_or_create(username="author2")[0]
        c = Category.objects.get_or_create(slug=cat, defaults={"name": cat.title()})[0]
        return Content.objects.create(
            author=author, type=type, title=title, slug=slug, body="b", category=c,
            status="PUBLISHED", view_count=views, published_at=timezone.now() - timedelta(days=days_ago),
        )

    def _slugs(self, qs):
        from rest_framework.test import APIClient

        return [x["slug"] for x in APIClient().get(f"/api/content/?type=TOOL_LISTING&{qs}").data]

    def test_sorts_and_category_filter(self):
        self._mk("b", "banana", "voice", 5, 1)
        self._mk("a", "Apple", "voice", 50, 9)
        self._mk("c", "cherry", "image", 1, 5)
        assert self._slugs("sort=newest") == ["b", "c", "a"]
        assert self._slugs("sort=alphabetical") == ["a", "b", "c"]
        assert self._slugs("sort=popular") == ["a", "b", "c"]
        assert self._slugs("category=voice&sort=alphabetical") == ["a", "b"]
        assert self._slugs("category=nope") == []
        assert self._slugs("sort=garbage") == ["b", "c", "a"]

    def test_categories_endpoint_scoped_to_type_with_content(self):
        from rest_framework.test import APIClient

        from apps.content.models import Category

        self._mk("t", "tool", "voice", 0, 1)
        self._mk("n", "news", "politics", 0, 1, type="NEWS")
        Category.objects.create(name="Empty", slug="empty")
        res = APIClient().get("/api/content/categories/?type=TOOL_LISTING")
        assert [c["slug"] for c in res.data] == ["voice"]


@pytest.mark.django_db
class TestAuthorByline:
    def test_author_name_uses_display_name_then_username_and_leaks_nothing_else(self):
        from rest_framework.test import APIClient

        from apps.content.models import Category, Content

        a = User.objects.create_user(username="hq", password="x", email="private@x.com", display_name="Hamza Qureshi")
        b = User.objects.create_user(username="plain", password="x", email="p2@x.com")
        cat = Category.objects.create(name="N", slug="n")
        for slug, author in (("s1", a), ("s2", b)):
            Content.objects.create(author=author, type="NEWS", title=slug, slug=slug, body="b",
                                   category=cat, status="PUBLISHED")
        c = APIClient()
        assert c.get("/api/content/s1/").data["author_name"] == "Hamza Qureshi"
        assert c.get("/api/content/s2/").data["author_name"] == "plain"
        assert {x["author_name"] for x in c.get("/api/content/").data} == {"Hamza Qureshi", "plain"}
        assert "private@x.com" not in str(c.get("/api/content/s1/").data)

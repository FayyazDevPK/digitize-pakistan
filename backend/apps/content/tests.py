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

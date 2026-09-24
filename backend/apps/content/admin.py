from django.contrib import admin

from .models import Category, Content


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "category", "visibility", "status", "author", "published_at")
    list_filter = ("type", "visibility", "status", "category")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "body")
    filter_horizontal = ("alternatives",)
    fieldsets = (
        (None, {"fields": ("author", "type", "title", "slug", "excerpt", "body", "cover_image_url")}),
        ("Classification", {"fields": ("category", "tags", "visibility", "status", "published_at")}),
        (
            "Tool listing details (TOOL_LISTING only)",
            {"fields": ("pros", "cons", "pricing_info", "alternatives")},
        ),
        ("Stats", {"fields": ("view_count",)}),
    )
    readonly_fields = ("view_count",)

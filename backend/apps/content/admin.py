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

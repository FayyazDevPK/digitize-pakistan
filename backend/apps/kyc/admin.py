from django.contrib import admin

from .models import KYCRecord


@admin.register(KYCRecord)
class KYCRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "document_type", "submitted_at", "reviewed_at")
    list_filter = ("status", "document_type")
    readonly_fields = ("submitted_at",)

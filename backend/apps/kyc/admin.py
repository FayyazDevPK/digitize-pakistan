from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html

from .models import KYCRecord


@admin.register(KYCRecord)
class KYCRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "document_type", "has_file", "submitted_at", "reviewed_at")
    list_filter = ("status", "document_type")
    readonly_fields = ("submitted_at", "document_link")

    def get_urls(self):
        custom = [
            path(
                "<int:pk>/document/",
                self.admin_site.admin_view(self.download_document),
                name="kyc_kycrecord_document",
            )
        ]
        return custom + super().get_urls()

    def download_document(self, request, pk):
        # Staff-session gated (admin_view); uploaded files are never publicly served.
        if not self.has_view_permission(request):
            raise Http404
        record = self.get_object(request, str(pk))
        if record is None or not record.document_file:
            raise Http404
        return FileResponse(record.document_file.open("rb"))

    @admin.display(boolean=True, description="File")
    def has_file(self, obj):
        return bool(obj.document_file)

    @admin.display(description="Uploaded document")
    def document_link(self, obj):
        if not obj.document_file:
            return "—"
        url = reverse("admin:kyc_kycrecord_document", args=[obj.pk])
        return format_html('<a href="{}" target="_blank">View file</a>', url)

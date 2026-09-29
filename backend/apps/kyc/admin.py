from django import forms
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html

from .models import KYCRecord

FILE_FIELDS = ("cnic_front", "cnic_back", "selfie", "document_file")


class KYCRecordAdminForm(forms.ModelForm):
    class Meta:
        model = KYCRecord
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("status") == "REJECTED" and not cleaned.get("rejection_reason"):
            raise forms.ValidationError(
                {"rejection_reason": "A rejection reason is required when rejecting a submission."}
            )
        return cleaned


@admin.register(KYCRecord)
class KYCRecordAdmin(admin.ModelAdmin):
    form = KYCRecordAdminForm
    list_display = ("user", "status", "full_name", "cnic_number", "submitted_at", "reviewed_at")
    list_filter = ("status", "document_type")
    search_fields = ("full_name", "cnic_number", "user__username")
    # reviewed_at/reviewed_by must never be typed by hand: reviewed_at is auto-stamped by
    # KYCRecord.save() on any transition into APPROVED/REJECTED, reviewed_by is stamped below
    # from the acting admin user.
    readonly_fields = ("submitted_at", "reviewed_at", "reviewed_by", "review_documents")
    fieldsets = (
        ("Applicant", {"fields": ("user", "document_type", "full_name", "cnic_number")}),
        ("Documents for review", {"fields": ("review_documents",)}),
        ("Decision", {"fields": ("status", "rejection_reason", "reviewed_at", "reviewed_by")}),
        ("Meta", {"fields": ("submitted_at", "audit_trail")}),
        (
            "Legacy submission (pre-full-KYC records only)",
            {"classes": ("collapse",), "fields": ("document_ref_url", "document_file")},
        ),
    )

    def save_model(self, request, obj, form, change):
        if "status" in form.changed_data and obj.status in KYCRecord.TERMINAL_STATUSES:
            obj.reviewed_by = request.user
        super().save_model(request, obj, form, change)

    def get_urls(self):
        custom = [
            path(
                "<int:pk>/file/<str:field>/",
                self.admin_site.admin_view(self.download_file),
                name="kyc_kycrecord_file",
            )
        ]
        return custom + super().get_urls()

    def download_file(self, request, pk, field):
        # Staff-session gated; uploaded files are never publicly served.
        if field not in FILE_FIELDS or not self.has_view_permission(request):
            raise Http404
        record = self.get_object(request, str(pk))
        f = getattr(record, field, None) if record else None
        if not f:
            raise Http404
        return FileResponse(f.open("rb"))

    @admin.display(description="Documents")
    def review_documents(self, obj):
        if not obj.pk:
            return "—"
        cells = []
        for field, label in (("cnic_front", "CNIC front"), ("cnic_back", "CNIC back"), ("selfie", "Selfie")):
            if getattr(obj, field):
                url = reverse("admin:kyc_kycrecord_file", args=[obj.pk, field])
                cells.append(
                    format_html(
                        '<div style="display:inline-block;margin:0 16px 12px 0;vertical-align:top">'
                        '<div style="font-weight:600;margin-bottom:4px">{}</div>'
                        '<a href="{}" target="_blank"><img src="{}" style="max-width:280px;max-height:220px;'
                        'border:1px solid #ccc;border-radius:6px"></a></div>',
                        label, url, url,
                    )
                )
            else:
                cells.append(format_html('<div style="margin-bottom:8px"><b>{}</b>: not provided</div>', label))
        if obj.document_file:
            url = reverse("admin:kyc_kycrecord_file", args=[obj.pk, "document_file"])
            cells.append(format_html('<div><a href="{}" target="_blank">Legacy document file</a></div>', url))
        return format_html("".join("{}" for _ in cells), *cells)

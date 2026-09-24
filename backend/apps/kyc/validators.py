import os
import uuid

from django.core.exceptions import ValidationError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_DOCUMENT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _check(file, allowed):
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed:
        raise ValidationError(f"Unsupported file type. Allowed: {', '.join(sorted(allowed))}")
    if file.size > MAX_UPLOAD_BYTES:
        raise ValidationError("File too large (max 5 MB).")


def validate_document_file(file):
    _check(file, ALLOWED_DOCUMENT_EXTENSIONS)


def validate_receipt_file(file):
    _check(file, ALLOWED_IMAGE_EXTENSIONS)


def _random_path(prefix, filename):
    # Random name so original filenames (often containing PII) aren't stored.
    return f"{prefix}/{uuid.uuid4().hex}{os.path.splitext(filename)[1].lower()}"


def kyc_upload_path(instance, filename):
    return _random_path("kyc", filename)


def receipt_upload_path(instance, filename):
    return _random_path("receipts", filename)

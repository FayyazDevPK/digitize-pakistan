import re

GMAIL_DOMAINS = {"gmail.com", "googlemail.com"}


def normalize_email(email):
    """
    Canonical form used ONLY to detect one inbox registered many times; the address itself is
    always stored exactly as typed. Lowercased; for gmail.com/googlemail.com the local part
    ignores dots and anything after "+", and googlemail.com is treated as gmail.com.
    """
    email = (email or "").strip().lower()
    if "@" not in email:
        return email
    local, _, domain = email.rpartition("@")
    if domain in GMAIL_DOMAINS:
        local = local.split("+", 1)[0].replace(".", "")
        domain = "gmail.com"
    return f"{local}@{domain}"


def _legacy_regex(local):
    # Matches any stored gmail/googlemail address that normalizes to this local part, so
    # accounts created before alias keys existed are still caught without touching them.
    body = r"\.*".join(re.escape(c) if not c.isalnum() else c for c in local)
    return rf"^\.*{body}\.*(\+[^@]*)?@(gmail|googlemail)\.com$"


def email_alias_taken(email, exclude_pk=None):
    from .models import User

    key = normalize_email(email)
    if not key or "@" not in key:
        return False
    local, _, domain = key.rpartition("@")
    qs = User.objects.filter(email_alias_key=key) | (
        User.objects.filter(email__iregex=_legacy_regex(local))
        if domain == "gmail.com" and local
        else User.objects.filter(email__iexact=key)
    )
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    return qs.exists()

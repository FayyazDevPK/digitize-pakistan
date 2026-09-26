"""Shared email helpers: signed tokens, link building and templated sending."""

import logging

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.http import base36_to_int, urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)


class _TimedTokenGenerator(PasswordResetTokenGenerator):
    """Django's signed-token generator plus a flow-specific maximum age."""

    max_age_seconds = 3600

    def check_token(self, user, token):
        if not user or not token or not super().check_token(user, token):
            return False
        issued = base36_to_int(token.split("-")[0])
        return (self._num_seconds(self._now()) - issued) <= self.max_age_seconds


class EmailVerificationTokenGenerator(_TimedTokenGenerator):
    key_salt = "apps.accounts.EmailVerificationTokenGenerator"
    max_age_seconds = 2 * 24 * 3600

    def _make_hash_value(self, user, timestamp):
        # Includes the address and verified flag, so a token dies once used or if the email changes.
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"


class PasswordResetTokenGeneratorShort(_TimedTokenGenerator):
    # Default hash value includes the password hash, so a reset token is single-use.
    key_salt = "apps.accounts.PasswordResetTokenGeneratorShort"
    max_age_seconds = 3600


email_verification_token = EmailVerificationTokenGenerator()
password_reset_token = PasswordResetTokenGeneratorShort()


def encode_uid(user):
    return urlsafe_base64_encode(str(user.pk).encode())


def decode_uid(uid):
    from .models import User

    try:
        return User.objects.get(pk=int(urlsafe_base64_decode(uid).decode()))
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None


def send_templated_email(to_email, subject, template, context):
    body = render_to_string(f"accounts/emails/{template}.txt", context)
    if "console" in settings.EMAIL_BACKEND:
        # The console backend quoted-printable-wraps long URLs; print the link in copyable form.
        print(f"[dev email] {template} -> {to_email}: {context.get('link')}", flush=True)
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
        return True
    except Exception:  # never let a mail-provider outage break the request that triggered it
        logger.exception("Failed to send %s email to user", template)
        return False


def send_verification_email(user):
    link = (
        f"{settings.FRONTEND_URL}/verify-email"
        f"?uid={encode_uid(user)}&token={email_verification_token.make_token(user)}"
    )
    return send_templated_email(
        user.email,
        "Verify your email — Digitize Pakistan",
        "verify_email",
        {"user": user, "link": link},
    )


def send_password_reset_email(user):
    link = (
        f"{settings.FRONTEND_URL}/reset-password"
        f"?uid={encode_uid(user)}&token={password_reset_token.make_token(user)}"
    )
    return send_templated_email(
        user.email,
        "Reset your password — Digitize Pakistan",
        "password_reset",
        {"user": user, "link": link},
    )

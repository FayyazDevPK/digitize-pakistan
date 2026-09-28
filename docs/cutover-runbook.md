# Digitize Pakistan — Launch Cutover Runbook

**Entity:** Digitize Online SMC (Private) Limited
**Target VPS:** 162.35.160.133 (Ubuntu 24.04) — this is the **same server** currently hosting
the old digitize.com.pk site.
**Scope:** A fresh, from-scratch deployment of Digitize Pakistan onto this VPS, replacing the old
digitize.com.pk site entirely. Per your explicit decision: no data, files, or backup from the
old site carry forward — the old site is simply wiped, not migrated from or preserved. **No
rollback mechanism exists for this decision** (see Section 5) — this is a deliberate, accepted
trade-off, not an oversight.

---

## 1. Pre-cutover checklist (do all of this before wiping the VPS)

### Database
- [ ] Provision PostgreSQL on the VPS (or a managed instance). Development has been running on
      SQLite throughout this build — SQLite is dev-only and must not be used in production.
- [ ] Update `DATABASES` in `config/settings.py` (or an environment-based settings split) to
      point at PostgreSQL. Install `psycopg` and add it to `requirements/base.txt`.
- [ ] Run `python manage.py migrate` against the fresh production database.
- [ ] Re-seed the `RewardRule` and initial `AdSlot` records that exist only as manual
      `get_or_create` shell scripts in this build log — write these as a proper Django data
      migration or management command so they aren't lost/forgotten. This was done ad hoc
      during development and needs to become a real, repeatable step.
- [ ] Create the real production superuser account (`createsuperuser`) — do not carry over the
      dev `fayyazliaquat` test account or its password.
- [ ] **Re-run the concurrency regression test** (`apps/rewards/tests.py::TestAwardPointsConcurrency`)
      against PostgreSQL specifically. It was adjusted during development to tolerate a SQLite
      single-writer limitation (`OperationalError: database table is locked`) — confirm that
      limitation doesn't apply under PostgreSQL and that the test still passes cleanly. The same
      applies to the withdrawal-balance row-lock fix (`select_for_update`), which also couldn't
      be fully proven under SQLite.

### Environment & secrets
- [ ] Generate a fresh `SECRET_KEY` for production — never reuse the dev key.
- [ ] Set `DEBUG = False`.
- [ ] Set `ALLOWED_HOSTS` to `digitize.com.pk` (and any API subdomain — see the DNS section).
- [ ] Move all secrets (DB credentials, `SECRET_KEY`, R2 credentials, email provider credentials,
      any future payment/SMS provider keys) into environment variables or a `.env` file excluded
      from git — confirm `.gitignore` already covers this (it does, per the original project
      setup).
- [ ] Set `CORS_ALLOWED_ORIGINS` to the real frontend domain only — remove `localhost:3000`.
- [ ] Set `NEXT_PUBLIC_API_URL` (frontend) to the real API domain.
- [x] **Transactional email configured (2026-09-29): Resend over SMTP.** Sending domain is
      verified in Resend; its DNS records are in Cloudflare. In `backend/.env` set
      `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST` to Resend's
      SMTP host, `EMAIL_HOST_USER=resend`, and `EMAIL_HOST_PASSWORD` to a Resend API key with
      Sending access restricted to our domain. `EMAIL_PORT` (587), `EMAIL_USE_TLS` (1) and
      `DEFAULT_FROM_EMAIL` use the `settings.py` defaults. Without these, Django falls back to
      the console backend and verification/reset emails silently print to the logs.
- [x] **Restrict `backend/.env` to its owner:** `chmod 600 .env` (and any `.env` backups). Safe
      because all three systemd services run as the deploy user; confirm with
      `systemctl show -p User` before tightening.

### Backend services
- [ ] Set up Gunicorn (or another WSGI server) behind Nginx, not `manage.py runserver` — the
      dev server is not production-safe.
- [ ] Run `python manage.py collectstatic`.
- [ ] Set up Celery worker and Celery Beat as **systemd services** (not manually-run terminal
      processes like in development) so they restart automatically on crash or reboot.
- [ ] Confirm Redis is configured with persistence (AOF or RDB) appropriate for production, and
      is not exposed publicly — bind to localhost or a private network only.
- [ ] Point `CACHES` and Celery's broker URL at the production Redis instance.
- [ ] Issue an SSL certificate (Let's Encrypt via Certbot, or your registrar/host's equivalent)
      for the domain(s) in use. Enforce HTTPS.

### Media storage
- [ ] Set up the Cloudflare R2 bucket (per the original architecture decision) and configure
      Django's media storage backend to use it, rather than local disk.

### Frontend
- [ ] Run a production build (`npm run build`) and confirm it completes cleanly.
- [ ] Confirm environment variables are set correctly in whatever hosting the frontend
      (Vercel, the same VPS via PM2/Nginx, etc.).

### Monetization
- [ ] Replace the placeholder AdSense publisher ID (`pub-0000000000000000`) in
      `frontend/public/ads.txt` and any seeded `AdSlot` records with the real AdSense
      publisher ID, once actually approved by Google AdSense — do not launch with placeholder
      ad identifiers live.
- [ ] Confirm the Privacy Policy, Terms of Service, and Payout Policy pages' content has had
      real legal review — all three were written as reasonable, functionally-accurate
      placeholders during development, not formal legal copy.

### KYC & compliance
- [ ] Confirm KYC document storage (CNIC front/back, selfie images) in production uses
      **access-controlled storage with server-side encryption at rest enabled** (e.g. Cloudflare
      R2's or S3's built-in encryption-at-rest option) — not a public bucket, and not left
      unencrypted. The current dev implementation stores these files unencrypted in private,
      staff-only-accessible storage; the app's own copy correctly says so rather than claiming
      encryption that doesn't exist yet. This must actually be true — configured encryption at
      rest — before launch, not just access-controlled.
- [ ] Reconfirm the KYC-gated withdrawal flow's hard security boundary is intact after the
      settings/database changes above — this is the platform's single most important security
      control and should be spot-checked end-to-end one more time post-deploy.

---

## 2. VPS wipe (this IS the retirement of the old site — no separate step)

Because `digitize.com.pk` and the new Digitize Pakistan deployment share the **same physical
VPS**, and per your decision that no backup or data from the old site is needed, wiping this
server clean is simultaneously the retirement of the old site and the preparation of the new
one — there is no separate "decommission the old site later" phase the way there would be if
they were on different infrastructure.

- [ ] **Reprovision/reimage the VPS from a fresh Ubuntu 24.04 image** through your hosting
      provider's control panel — this is the cleanest way to guarantee no leftover configuration
      from the old site (old Nginx server blocks, old systemd services, old cron jobs, old
      database installations) interferes with the new stack.
- [ ] If a full reimage isn't practical, at minimum manually stop and remove the old site's web
      server config, database service, and any systemd/cron jobs tied to the old codebase, and
      confirm no old process is still listening on the ports the new stack needs (80/443, the
      Django/Gunicorn port, PostgreSQL's port, Redis's port).
- [ ] **No backup is being taken** (per your explicit decision) — once this step runs, the old
      site and its data are gone. This is intentional, not a gap to fix.
- [ ] Proceed with the pre-cutover checklist (Section 1) on this clean VPS.

---

## 3. DNS

Because this is the same server, `digitize.com.pk`'s DNS most likely **already points at the
correct IP** (162.35.160.133) — there is probably no A-record change needed at all, unlike a
typical cutover to new infrastructure.

- [ ] Confirm the existing A record for `digitize.com.pk` already resolves to 162.35.160.133 —
      if so, no DNS change is needed for the root domain.
- [ ] If the backend API will be served on a separate subdomain (e.g. `api.digitize.com.pk`)
      rather than reverse-proxied under a path on the same domain (e.g. `digitize.com.pk/api/`),
      add that subdomain's DNS record now, and make sure it's covered by the SSL certificate
      issued in Section 1.
- [ ] If for any reason DNS does need to change, lower the TTL a few days in advance so it
      propagates quickly, and verify propagation with `dig` or an online checker before assuming
      it's live everywhere.

---

## 4. Go-live smoke test

Once the new deployment is live, manually walk through the critical paths **on production**, not
just trusting that dev testing covers it:

- [ ] Register a brand-new real account, confirm the welcome flow works and a real verification
      email actually arrives (via the real production email provider, not the dev console
      backend)
- [ ] Log in, confirm the dashboard loads with real (empty, for a new account) data
- [ ] Read an article, confirm points are awarded (check the dashboard ledger)
- [ ] Submit a KYC document, confirm the submission is received
- [ ] (As an admin) approve that KYC submission, confirm the user's status updates and they
      receive a notification
- [ ] Attempt a withdrawal below the KYC-approved threshold — confirm it's correctly blocked
- [ ] Apply to the Creator Program as a Premium test account, confirm the flow works
- [ ] Request a password reset for a real account, confirm the reset email arrives and the flow
      actually works end-to-end in production
- [ ] Confirm `/robots.txt` and `/sitemap.xml` are reachable and correct on the real domain
- [ ] Confirm the consent banner and at least one ad placement render correctly
- [ ] Check the Django admin is reachable and NOT publicly indexable (confirm `/admin/` isn't
      in the sitemap, and consider IP-restricting it if the hosting setup allows)

---

## 5. Rollback — there isn't one

Because you've chosen not to take a pre-wipe backup or snapshot, **there is no rollback path**
if something goes seriously wrong after the VPS is wiped and the new site goes live. This is a
deliberate, accepted trade-off, not an oversight — documenting it plainly here rather than
leaving a rollback plan that wouldn't actually work (the classic "revert DNS to the old site's
IP" approach doesn't apply, since the old site no longer exists once Section 2 runs on the same
server it shared with the new one).

Practical implication: **do not run Section 2 (the wipe) until everything in Section 1 has been
fully prepared and tested as thoroughly as possible beforehand** — the margin for catching
problems before they matter is entirely front-loaded into the pre-cutover checklist, since
there's no "undo" once the wipe happens.

---

## 6. Post-launch monitoring (first week)

- [ ] Watch Django/Gunicorn error logs and Celery worker logs daily for the first week.
- [ ] Monitor the KYC-gated withdrawal path specifically — it's the platform's highest-stakes
      code path and the one most worth watching closely with real users and real (if small)
      money movement.
- [ ] Check Redis memory usage and Celery queue length aren't growing unexpectedly.
- [ ] Review the first batch of real KYC submissions and withdrawal requests manually before
      fully trusting the admin approval workflow at scale.
- [ ] Confirm the production email provider is actually delivering (check for bounces/spam-
      folder issues) — email verification and password reset are only useful if the emails
      reliably arrive.

---

## Appendix — real gotchas found during the actual VPS deployment (2026-09-27)

These weren't anticipated in the original checklist above and cost real debugging time. If this
server is ever rebuilt from scratch, check for all of these again:

1. **PostgreSQL 15+ schema permissions**: `GRANT ALL PRIVILEGES ON DATABASE ... TO app_user`
   does NOT include permission to create tables in the `public` schema on PostgreSQL 15+ (a
   security default change). Migrations fail with `permission denied for schema public` until
   you also run `GRANT ALL ON SCHEMA public TO app_user;`.

2. **`STATIC_ROOT` was never set** — never needed in dev (`runserver` serves static files
   automatically), but `collectstatic` fails with `ImproperlyConfigured` without it in
   production. Added `STATIC_ROOT = BASE_DIR / 'staticfiles'` to settings.py.

3. **Home directory permissions block Nginx from serving static files.** If the app's static
   files live under `/home/<deploy-user>/...`, and that user's home directory has the default
   `750` permissions, Nginx (running as its own user) gets a `403 Forbidden` trying to traverse
   into it — even though the actual static files themselves are correctly readable. Fix:
   `chmod o+x /home/<deploy-user>` (adds traverse-only permission for "others", doesn't expose
   directory listing).

4. **`CORS_ALLOWED_ORIGINS` was left at the dev default** (`localhost:3000` only) — with the
   frontend and backend on separate subdomains in production (`digitize.com.pk` and
   `api.digitize.com.pk`), every API call from the browser was blocked by CORS until this was
   set via the `CORS_ALLOWED_ORIGINS` environment variable to the real production origins.

5. **`ALLOWED_HOSTS` needs the API's own subdomain too**, not just the frontend domain — Django
   rejects requests where the `Host` header doesn't match, so `api.digitize.com.pk` itself must
   be in `ALLOWED_HOSTS`, easy to forget since it feels like "the API doesn't need to allow
   itself."

6. **Domain-name text (especially anything starting with `www.`) gets corrupted when copied
   through chat/terminal interfaces** with URL auto-detection — appeared as markdown link syntax
   (`[text](url)`) inside actual files. When setting any config value containing a domain name,
   verify the actual file content via a method immune to this (character count, hash, or
   `repr()` output) rather than trusting a visual paste-back, and prefer `base64`-encoded
   transfer for exact values.

7. **`backend/.env` was created world-readable (664)**, so any user on the server could read
   every secret. Fixed with `chmod 600` after confirming gunicorn, celery-worker and
   celery-beat all run as `deploy`. Lock backups too, since they hold the same secrets.

8. **Services only read `.env` at startup.** A Django shell test (`python manage.py shell`
   after loading `.env`) proves new settings work, but the live site keeps the old values
   until gunicorn and the celery services are restarted. Always restart after editing `.env`.

# Digitize Pakistan — Full Site Audit

**Date:** 2026-09-23
**Scope:** Django backend (`backend/apps/*`), Next.js frontend (`frontend/src/*`)
**Method:** Manual code review of every app/view/serializer/model in the backend and every
route/component in the frontend, plus live checks against the running dev servers
(`tsc --noEmit`, `eslint`, `pip-audit`, `npm audit`, repeated route hits with response-code and
console/log inspection). No fuzzing or automated pentest tooling was used.

---

## 1. Executive summary

Overall risk posture is **moderate**, with one **critical, actively-shipping bug** (the site's
root URL served the unmodified `create-next-app` scaffold instead of the app) and one
**critical XSS vector I introduced in an earlier session** (unescaped `</script>` breakout in
JSON-LD). Both are fixed in this pass. The core money boundary — KYC-gated withdrawals — is
correctly enforced in the service layer and I found no way to bypass it. However, I found a
**real, unfixed race condition in the withdrawal balance check** (the same class of bug the
daily-cap fix in `apps/rewards/services.py` already addresses once, but the withdrawal path
itself was never brought in line with that fix) and a **concrete, low-effort referral-fraud
path** (no email uniqueness, no email verification, no CAPTCHA, one free milestone = a paid
referral bonus). Both need a product decision before fixing and are detailed below.

Dependency scanning (`pip-audit`, `npm audit`) found no known CVEs at current pinned versions.
Permission checks are consistently applied — every view explicitly sets `permission_classes`,
and the earlier privilege-escalation bug (writable `tier`/`role`/`kyc_status`) has not
regressed anywhere else I checked.

**Most urgent items, in order:**
1. ~~Root URL (`/`) served the Next.js starter template~~ — **fixed in this pass**.
2. ~~Stored XSS via JSON-LD script injection~~ — **fixed in this pass**.
3. Withdrawal double-spend race condition — **needs a decision**, see Critical Findings.
4. Referral/registration fraud path — **needs a decision**, see High Findings.
5. No login throttling (brute-force) — **needs a decision** (trivial to add, but confirm rate).

---

## 2. Critical findings

### 2.1 — Site root (`/`) served the Next.js scaffold page, not the app — **FIXED**
- **Where:** `frontend/src/app/page.tsx`
- **What:** This file was still the literal, unmodified `create-next-app` boilerplate
  ("To get started, edit the `page.tsx` file...", links to Vercel/Next.js docs). Every internal
  link in the app points to `/news`, `/dashboard`, etc. — nothing ever linked to `/`, so this
  was never caught by clicking around the app itself. It's the actual bare-domain root that a
  browser address bar, a shared link, or Google's indexer would land on.
  It also silently undermined the sitemap work from the previous session:
  `frontend/src/app/sitemap.ts` lists `${SITE_URL}/` at `priority: 1` (the highest-priority URL
  in the whole sitemap) — meaning the most important URL a search engine would crawl served
  dev scaffolding.
- **Why it matters:** Anyone visiting the site's actual root domain saw a broken developer
  template instead of the product. This is as close to "the site is down" as a bug can be
  without an error page.
- **Fix applied:** `page.tsx` now does a server-side `redirect("/news")` (Next.js
  `next/navigation`), consistent with `/news` already being treated as the homepage everywhere
  else (`PublicHeader`'s logo links there, the design system labels it "Homepage · desktop").
  Verified: `curl -I http://localhost:3000/` now returns `307` → `location: /news`.

### 2.2 — Stored XSS via unescaped `</script>` in JSON-LD — **FIXED**
- **Where:** `frontend/src/app/(public)/news/[slug]/page.tsx` (introduced in the SEO-audit
  session that added structured data), also present defensively in
  `frontend/src/app/(public)/news/page.tsx`.
- **What:** Both pages built a JSON-LD object and rendered it via
  `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />`.
  `JSON.stringify()` does **not** escape the `<` character. The article page's JSON-LD embeds
  `article.title` and `article.excerpt` directly — both are creator-submitted, user-controlled
  text (see `apps/creator/views.py::SubmissionsView.post`, which takes `title`/`excerpt` from
  `request.data` with no HTML sanitization before storing). A title or excerpt containing the
  literal substring `</script>` would close the real script tag early; everything after it in
  the string is then parsed as page HTML, including a second, attacker-controlled `<script>`
  tag that executes in every visitor's browser — classic stored XSS.
- **Why this is critical, not just "high":** this app stores JWT access **and refresh** tokens
  in `localStorage` (`frontend/src/lib/auth.ts`), not httpOnly cookies, specifically because
  Server Components have no way to read auth state otherwise. Any working XSS on this app is
  therefore a full account-takeover primitive — `localStorage.getItem('dp_access_token')` /
  `dp_refresh_token` are trivially exfiltrated, and because token blacklisting isn't configured
  (see 3.3), a stolen refresh token stays valid for its full lifetime even after the victim
  "logs out."
- **The `news/page.tsx` Organization schema was not actually exploitable** — its JSON-LD is
  built entirely from hardcoded strings, no user input — but I fixed it too for consistency and
  because it's the same footgun waiting for the next person who copies the pattern.
- **Fix applied:** new `frontend/src/lib/json-ld.ts` exporting `safeJsonLd()`, which does
  `JSON.stringify(data).replace(/</g, "\\u003c")` — the standard, behavior-preserving escape for
  this exact problem (browsers unescape `<` before JSON-parsing the script content, so
  the data is unchanged; the literal `<` that could break out of the tag never appears in the
  HTML). Both call sites now use it. Verified the article page still renders valid, correctly
  populated `NewsArticle` JSON-LD after the change.
- **Residual recommendation:** creator-submitted `title`/`body`/`excerpt` are also rendered
  as plain text elsewhere (React's default JSX escaping handles that safely — I checked every
  render site and none use `dangerouslySetInnerHTML` for body copy). The JSON-LD path was the
  only unsafe one. No further action needed there, but it's worth remembering *any* future
  feature that serializes user content into an inline `<script>` (JSON-LD, hydration payloads,
  analytics beacons) needs the same treatment.

### 2.3 — Withdrawal balance check has no locking — race condition allows double-spend (**not fixed — needs a decision**)
- **Where:** `apps/rewards/services.py::request_withdrawal()`
- **What:** This function reads the user's balance (`get_balance()`, a `Sum()` aggregate over
  `RewardsLedgerEntry`), checks `points > balance`, and only then creates the negative ledger
  entry and the `WithdrawalRequest`. There is no `transaction.atomic()` block, no
  `select_for_update()`, and no unique constraint preventing two withdrawal requests from being
  in flight for the same user at once. Two concurrent `POST /api/rewards/withdrawals/` calls
  for the same user (e.g. a double-click on the "Withdraw" button before the UI's `disabled`
  state commits, or a deliberately concurrent script) can both read the same starting balance,
  both pass the `points > balance` check, and both succeed — over-drawing the balance by up to
  the full requested amount a second time.
- **This is exactly the bug pattern the project already found and fixed once**, per the
  comment in `apps/rewards/services.py::award_points()` itself ("a plain `cache.get()` then
  `cache.set()` pattern lets concurrent requests all read the same 'before' value and all pass
  the cap check together") — but that fix (atomic Redis `incr` for the *daily cap*) only covers
  awarding points, not withdrawing them. The withdrawal path was never revisited with the same
  scrutiny, even though it's the higher-stakes one (it converts to real Rs and creates a
  `WithdrawalRequest` a human will act on).
- **Why I didn't fix this directly:** it's exactly the kind of "touches money logic" change the
  brief asked me to report rather than apply. There's a real design decision here between at
  least two approaches with different trade-offs:
  - `transaction.atomic()` + `User.objects.select_for_update().get(pk=user.pk)` wrapping the
    whole balance-check-and-create sequence — straightforward, but ties up a DB row lock for
    the duration of the request.
  - A DB-level constraint (e.g. a partial unique index limiting one `REQUESTED`/`PENDING`
    withdrawal per user) — cheaper, but changes user-facing behavior (a user genuinely
    couldn't queue two withdrawals even if they had the balance for both, which arguably they
    shouldn't be able to today anyway, but that's a product call).
  - Keep it purely additive with a repurposed version of the same atomic Redis counter pattern
    already used for the daily cap.
  I'd lean toward the `select_for_update()` approach as the smallest change that closes the
  hole, but this is a money-boundary change and should be confirmed before I touch it.
- **Reproduction:** with a user who has exactly enough balance for one withdrawal, fire two
  concurrent `POST /api/rewards/withdrawals/` requests with the same `points` value. Expect one
  to fail with `InsufficientBalance`; currently both can succeed.

---

## 3. High findings

### 3.1 — Referral/registration fraud path has no real friction (not fixed — needs a decision)
- **Where:** `apps/accounts/models.py` (`User.email`), `apps/accounts/serializers.py`
  (`RegisterSerializer`), `apps/referrals/tasks.py::evaluate_referral_qualifications`.
- **What, concretely:**
  - `User.email` is `blank=True` and **not `unique=True`** — confirmed directly against the
    model field (`unique: False, blank: True`). Any number of accounts can share one email, or
    have none at all.
  - `RegisterSerializer` never sends a verification email or otherwise confirms email
    ownership — an email is accepted and stored as-is.
  - `evaluate_referral_qualifications` (the Celery beat task that pays out
    `REFERRAL_BONUS`) qualifies a referral the moment the **referred** user has completed *any
    one* `LearningPathProgress` record — i.e., one free milestone, in any path.
  - Registration is throttled at `10/hour` per IP (`apps/accounts/throttles.py` +
    `register: "10/hour"` in settings) — real friction, but not a hard stop, and easily spread
    across IPs.
  - The ToS page (`frontend/src/app/(public)/terms/page.tsx`) does explicitly prohibit
    "self-referrals or fabricated signups," which tells me this was already recognized as a
    risk in principle — it just isn't backed by any technical control.
- **Concrete exploit path:** register account A. Register accounts B, C, D... using A's
  referral code, with throwaway/duplicate emails (none of which need to be real or unique).
  Complete one free milestone on each. A collects `REFERRAL_BONUS` for each one, capped only by
  A's own daily reward cap (which resets every day) and the 10/hour registration throttle. This
  is a scriptable, low-effort way to convert "free milestones" into real Rs via the referral
  system, entirely within the letter of the API even though it violates the ToS.
- **Why I didn't fix this directly:** there's no single obviously-correct fix — options range
  from making email required+unique+verified (a real onboarding-friction product decision), to
  adding device/IP fingerprint checks on the referral-qualification task, to requiring the
  *referrer's* KYC approval before referral bonuses pay out, to just accepting the risk at
  current scale. This needs product input, not just a code change.
- **Suggested minimum fix if a decision is wanted fast:** make `email` `unique=True` and
  require it at registration (closes the trivial "N accounts, one inbox" case) — this alone is
  a small, mostly-safe migration, but I'm flagging rather than applying it because it's a schema
  change with a data-migration question (what about existing non-unique/blank emails already in
  the dev DB?) and a product-facing behavior change (registration gets stricter).

### 3.2 — No brute-force protection on login (not fixed — needs a decision on the rate)
- **Where:** `config/urls.py` — `path("api/token/", TokenObtainPairView.as_view(), ...)`.
- **What:** `TokenObtainPairView` (from `djangorestframework-simplejwt`) has no
  `throttle_scope` attribute set. `AtomicScopedRateThrottle.allow_request()`
  (`apps/accounts/throttles.py`) returns `True` immediately when `throttle_scope` isn't set —
  by design, this is how the custom throttle "opts in" per-view — but it means **login is
  completely unthrottled**. An attacker can attempt unlimited password guesses against any
  username with no rate limit, no lockout, no CAPTCHA.
  `TokenRefreshView` is likewise unthrottled, though that's lower-value to attack (refresh
  tokens aren't guessable).
- **Why I didn't fix this directly:** adding a `throttle_scope` here requires subclassing or
  wrapping `TokenObtainPairView` (it's a third-party view, not one of the app's own), and
  picking a rate is a product/security trade-off (too strict locks out legitimate users on
  shared IPs/NAT; too loose doesn't help). This is a two-line change once a rate is chosen, but
  I'm flagging it rather than guessing the right number.
- **Suggested fix:** a thin subclass in `apps/accounts/views.py`:
  ```python
  class ThrottledTokenObtainPairView(TokenObtainPairView):
      throttle_scope = "login"
  ```
  wired into `config/urls.py` in place of the stock view, plus a `"login": "<rate>/min"` entry
  in `DEFAULT_THROTTLE_RATES`. A reasonable starting point discussed in security literature for
  this kind of app is something like 5–10 attempts/minute per IP, but that's exactly the number
  I'd want confirmed rather than pick unilaterally.

### 3.3 — No server-side token revocation (logout doesn't actually invalidate anything)
- **Where:** `config/settings.py` (no `SIMPLE_JWT` config block at all, so 100% library
  defaults apply — 5 min access / 1 day refresh, no rotation, no blacklist), and the frontend's
  logout (`AppSidebar.tsx::handleLogout` — confirmed it only calls `clearTokens()`, a
  `localStorage.removeItem`, with no API call).
- **What:** `rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`. There is no
  way to invalidate a refresh token server-side. "Logging out" only removes the token from the
  current browser's `localStorage` — if a token was ever copied elsewhere (stolen via XSS
  before this pass's fix, synced via a compromised device, etc.), it remains valid to mint new
  access tokens for up to its full 1-day lifetime regardless of any logout action.
- **Why this compounds with 2.2:** before this session's XSS fix, an attacker who got a token
  out via the JSON-LD hole would have had a persistent, un-revocable session for up to a day
  even if the victim immediately logged out and changed their password (password change doesn't
  invalidate existing JWTs either, for the same reason).
- **Suggested fix (not applied — a real auth-architecture decision):** enable
  `rest_framework_simplejwt.token_blacklist`, set `ROTATE_REFRESH_TOKENS` +
  `BLACKLIST_AFTER_ROTATION` in a `SIMPLE_JWT` settings block, and have logout call a
  `/api/token/blacklist/` endpoint with the current refresh token. This is a standard,
  well-trodden pattern but touches the auth flow on both ends and deserves a deliberate rollout
  rather than a drive-by fix in an audit pass.

### 3.4 — Content `type` is fully user-controlled on creator submissions
- **Where:** `apps/creator/views.py::SubmissionsView.post`.
- **What:** `content_type = request.data.get("type", "TUTORIAL")` is passed straight to
  `Content.objects.create(type=content_type, ...)` with no validation against
  `Content.TYPE_CHOICES` (`NEWS`, `TUTORIAL`, `GUIDE`, `TOOL_LISTING`). Model `choices=` are not
  enforced at the ORM `.create()` level (only via `full_clean()`, which this code path never
  calls). A creator (a real, lower-trust account tier — anyone who applied and got approved)
  can submit content tagged `type="TOOL_LISTING"`, which would surface it in the Tool Directory
  — a surface the product explicitly markets as "reviewed by our desk" — or `type="NEWS"`, gaining
  placement alongside editorial content.
- **Why this doesn't go higher than High:** content still requires admin approval
  (`ContentSubmission.review_status` starts `SUBMITTED`, and `Content.status` starts
  `IN_REVIEW`; nothing goes public without an admin running the `approve_submission` admin
  action) — so this is a trust/labeling integrity issue an attentive reviewer would likely
  catch, not a way to publish unreviewed content. But it's a real gap in what the API itself
  permits, independent of whether a human happens to notice.
- **Suggested fix:** validate `content_type` against an explicit allow-list of types a creator
  is actually permitted to submit as (probably `TUTORIAL`/`GUIDE`, excluding `NEWS` and
  `TOOL_LISTING` which read as editorially-controlled), returning 400 otherwise. Small,
  low-risk, but I left it unfixed since it's a content-policy question (which types *should*
  creators be allowed to pick?) rather than a pure bug.

---

## 4. Medium findings

### 4.1 — No global default `permission_classes` (defense-in-depth gap, not an active hole)
- **Where:** `config/settings.py` — `REST_FRAMEWORK` has no `DEFAULT_PERMISSION_CLASSES`, so
  DRF's own default (`AllowAny`) is the fallback for anything that forgets to set
  `permission_classes` explicitly.
- **What I checked:** every single view in every app (`accounts`, `ads`, `content`, `creator`,
  `kyc`, `learning_paths`, `notifications`, `referrals`, `rewards`) currently sets
  `permission_classes` explicitly — I found no view relying on the implicit default today.
- **Why it's still worth flagging:** this is "secure by convention," not "secure by default."
  The very next view someone adds is one missed `permission_classes` line away from being
  silently public. Setting `DEFAULT_PERMISSION_CLASSES: ["rest_framework.permissions.IsAuthenticated"]`
  globally costs nothing today (every view already opts out explicitly where it needs to be
  public via `AllowAny`) and converts future mistakes from "silently public" to "fails closed."
  I didn't apply this myself only because it's a global settings change I'd want on record as
  reviewed rather than slipped into an audit pass.

### 4.2 — No pagination on list endpoints
- **Where:** `apps/content/views.py::ContentListView` (backs `/news`, `/tools`, and the
  sitemap generator), `apps/rewards/views.py::BalanceView` (`[:20]` hardcoded slice),
  `apps/notifications/views.py::NotificationListView` (`[:30]` hardcoded slice).
- **What:** `REST_FRAMEWORK` has no `DEFAULT_PAGINATION_CLASS` configured anywhere.
  `ContentListView` returns **every** published `Content` row with no limit at all — at current
  seed-data scale this is a non-issue, but there's no ceiling: a large news archive would mean
  `/api/content/` (and therefore `/news`, `/tools`, and `frontend/src/app/sitemap.ts`, which
  calls `getContentList()` with no type filter to build the sitemap) returns and serializes the
  entire table on every request. `BalanceView`/`NotificationListView` at least cap the result
  size with a slice, but that's "no pagination" wearing a seatbelt, not real pagination — there's
  no way to see ledger entry 21+ or notification 31+.
- **Suggested fix:** add DRF's `PageNumberPagination` (or `LimitOffsetPagination`) as the
  project default, and give the frontend's `getContentList()` / sitemap generator a real
  "fetch all pages" loop instead of assuming one response has everything. Not urgent at current
  data volume; flagging so it's on record before real content volume arrives.

### 4.3 — Hardcoded `SECRET_KEY`, `DEBUG=True`, no environment-based config
- **Where:** `config/settings.py`.
- **What:** `SECRET_KEY` is a literal string committed to the repo (Django's own
  `django-insecure-` prefix marks it as a dev placeholder, so this is expected for a dev
  checkout — but there is **no mechanism at all** to override it via environment variables;
  `settings.py` has zero `os.environ` usage anywhere). Same for `DEBUG = True`,
  `ALLOWED_HOSTS = []`, and the Redis/Celery URLs (`redis://localhost:6379/...` hardcoded).
  The frontend, by contrast, already does this correctly (`NEXT_PUBLIC_API_URL` via
  `.env.local`, which is gitignored).
- **Why it matters:** this isn't exploitable today (it's a local dev checkout, and `.env`/
  `db.sqlite3` are correctly gitignored so no real secrets or user data are actually committed)
  but there is currently no path to deploy this backend to any environment without editing
  `settings.py` directly, which is exactly how a real secret key or a `DEBUG=True` ends up
  shipped by accident.
- **Suggested fix:** introduce `django-environ` or `python-decouple`, move `SECRET_KEY`,
  `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and the Redis/Celery URLs to environment
  variables with dev-safe defaults, add a `.env.example`. Standard pre-launch checklist item,
  not touched in this pass since it's an infrastructure change with no urgency at dev-only
  scale.

### 4.4 — Mobile bottom nav doesn't cover, or reflect, the full authenticated nav
- **Where:** `frontend/src/components/MobileTabBar.tsx` vs. `frontend/src/components/AppSidebar.tsx`.
- **What:** `AppSidebar` (desktop, `hidden md:flex`) has 6 destinations: Overview, My learning,
  Rewards, Referrals, Creator studio, Settings. `MobileTabBar` (mobile-only) has 4: News, Tools,
  Learn (`/my-learning`), Earn (`/rewards`). On mobile, a logged-in user has **no persistent nav
  entry point to Dashboard, Referrals, Settings, Creator Studio, or KYC** — those pages are only
  reachable by a direct link from within another page (or typing the URL). Separately, because
  the active-state check is `pathname?.startsWith(tab.href)` and none of the 4 tab hrefs match
  those routes, visiting `/dashboard`, `/referrals`, `/settings`, or `/creator` on mobile shows
  *no* tab highlighted at all — not wrong, just silently uninformative.
- **Why Medium, not Low:** Settings and Creator Studio in particular have no mobile discovery
  path at all today, which is a real usability gap on what the product treats as its primary
  surface (mobile-first messaging throughout the copy, e.g. "read on a 5-inch screen" language
  in the brand doc).
  suggest either a 5th "More" tab that opens a sheet with the remaining destinations, or moving
  Settings/Creator/Referrals under a profile-avatar menu — I didn't pick one since it's a design
  decision, not a bug fix.

### 4.5 — `IsKYCApproved` and `IsCreator` permission classes are defined but never used
- **Where:** `apps/accounts/permissions.py`.
- **What:** Both classes exist and look correct, but nothing in the codebase applies them.
  The actual enforcement is done ad hoc instead: the KYC gate lives in
  `apps/rewards/services.py::request_withdrawal` as a manual `if user.kyc_status != "APPROVED"`,
  and the Creator gate lives in `apps/creator/views.py::SubmissionsView.post` as
  `if request.user.role != "CREATOR"`. Functionally these are equivalent and I found no gap
  from it — but a future developer skimming `permissions.py` could reasonably assume
  `IsKYCApproved` is wired in somewhere and rely on it being enforced when it isn't, anywhere it
  might later get referenced without checking.
- **Suggested fix:** either apply the permission classes where the manual checks currently live
  (mostly cosmetic — the withdrawal check specifically should probably stay in the service
  layer per its own comment, "this is the one place that must never be bypassed," so I'd leave
  that one as-is) or delete the unused classes to avoid the false signal. Low-risk either way;
  didn't touch it since it's a style/cleanup call, not a bug.

### 4.6 — Generic error handling swallows field-level validation messages
- **Where:** `frontend/src/app/(app)/kyc/page.tsx`, `frontend/src/app/(app)/rewards/page.tsx`
  (withdrawal form), `frontend/src/app/(auth)/register/page.tsx` — all display
  `body.detail || "<generic message>"` on a failed submission.
- **What:** DRF's default validation-error shape for a bad field (e.g. an invalid
  `document_ref_url`, or a `points` value that fails `Decimal()` parsing) is
  `{"field_name": ["message"]}`, not `{"detail": "message"}`. `detail` is only present for
  exceptions explicitly raised as `Response({"detail": ...})`, which is what the *service-layer*
  errors (KYC-not-approved, below-minimum, insufficient-balance) use — but plain serializer
  validation errors fall through to the generic fallback message with no indication of which
  field was wrong or why. Example: submitting a KYC doc link like `"not a url"` returns 400 with
  `{"document_ref_url": ["Enter a valid URL."]}`, and the KYC page shows only "Submission
  failed." with no further detail.
- **Suggested fix:** a small shared helper that flattens either error shape into a display
  string, applied at the 3 call sites above. Straightforward, but touches 3 files' error paths;
  flagging rather than doing it inline given the volume of other findings in this pass.

---

## 5. Low findings

- **`apps/rewards/services.py::request_withdrawal`** doesn't validate `method` against
  `WithdrawalRequest.METHOD_CHOICES` before `.create()` (same "choices aren't enforced outside
  `full_clean()`" gap as 3.4) — a malformed `method` string can be persisted. Low impact (display-only
  field, not a security boundary), but worth tightening alongside 3.4 if that gets addressed.
- **`apps/ads/views.py`** (`AdSlotListView`, `AdSlotClickView`) have no rate limiting on
  impression/click tracking — a bot could inflate `impressions`/`clicks` counters. Business-metric
  integrity issue for direct-advertiser billing, not a security hole; low priority since
  direct-advertiser booking itself is still out of scope (see Gaps).
- **`RegisterSerializer.password`** has server-side `min_length=8` (good — this is enforced, not
  just a client-side HTML attribute) but no complexity/strength requirement beyond Django's
  default `AUTH_PASSWORD_VALIDATORS` (similarity, common-password, numeric-only checks are
  active; there's no length beyond 8 or character-class requirement). Reasonable for a v1, worth
  a note only.
- **No pagination on `RewardsLedgerEntry`/`Notification`** beyond the hardcoded slices already
  covered in 4.2 — same root cause, listed separately here only because they're less urgent than
  the unbounded `ContentListView`.
- **Dependency scan:** `pip-audit` (backend) and `npm audit` (frontend) both report **zero known
  vulnerabilities** at current pinned versions. `pip list --outdated` flags only `amqp`
  (5.3.1 → 5.4.0, a transitive Celery dependency, minor version bump). `npm outdated` shows
  React, TypeScript, ESLint, and `@types/node` all have newer majors available, but nothing
  flagged by `npm audit` as a security issue — these read as routine version drift, not risk.
  I did not attempt to look up CVE IDs by hand against the pinned version numbers, since several
  (Next.js 16, React 19.2/19.3, Django 6.1.1) don't correspond to real-world released versions
  in this environment — the two audit tools above are the trustworthy signal here.

---

## 6. Gaps against what this project set out to build

These are missing/incomplete features, not bugs — noted per the brief's explicit checklist.

- **"Saved tools"** — confirmed fully removed with no remnants: no model, no orphaned
  migration, no dead frontend code (`grep -rni "saved.tool\|savedtool\|bookmark"` across both
  `backend/` and `frontend/` returns nothing). Clean deferral.
- **Tool detail pages with no seed data** — `/tools/[slug]` handles a nonexistent/no-content
  case correctly (`notFound()` → real Next.js 404, confirmed via `curl` returning 404, not a
  500 or blank page) — but since the dev database has zero `TOOL_LISTING` rows, the *happy
  path* (a real tool card rendering with actual data) has never actually been exercised, only
  code-reviewed. Worth a manual pass once real tool content exists.
- **Direct-advertiser booking** — confirmed still fully admin-only. `AdSlot` (in
  `apps/ads/models.py`) has the `DIRECT` slot type with `advertiser_name`/`image_url`/
  `target_url`/`starts_at`/`ends_at`, editable only via Django admin (`apps/ads/admin.py`).
  There is no public-facing "advertiser self-serve" endpoint, no booking form, nothing
  half-built. Clean deferral, as stated.
- **Password reset — missing.** No `urls.py` entry, no view, no serializer anywhere in
  `apps/accounts/` for a reset flow. A user who forgets their password has no self-service path
  back into their account today. This is a real, user-facing gap for launch, not just a
  nice-to-have — flagging as the single most important *missing feature* in this audit.
- **Email verification — missing**, and compounds directly with 3.1 above: `RegisterSerializer`
  neither requires a real email nor verifies ownership of whatever email is given.
- **KYC document upload — confirmed to be URL-only, no real file upload.**
  `KYCRecord.document_ref_url` (`apps/kyc/models.py`) is a plain `URLField`; `KYCSubmissionView`
  (`apps/kyc/views.py`) just validates and stores whatever URL string the client sends via
  `KYCRecordSerializer` — no upload endpoint, no storage backend (S3/local media), nothing
  fetches or validates that the URL actually points to an image/document. This matches what the
  frontend's KYC page already implies (a plain text "Document link" input, not a file picker) —
  the gap is confirmed real, not just a frontend simplification of a working backend feature.
  Also worth noting for the security side: because nothing server-side ever fetches this URL,
  there's no SSRF exposure from it today — but that also means there's currently no way to
  confirm a submitted document even exists or is reachable, so compliance review has to trust
  screenshots or side channels.
- **Creator Program licensing terms — not surfaced in the submission flow.** The Terms of
  Service page (`frontend/src/app/(public)/terms/page.tsx`) states creators "grant Digitize
  Pakistan a license to publish, distribute, and monetize" submitted content. The actual
  submission form (`frontend/src/app/(app)/creator/page.tsx`) has no link to the Terms page, no
  checkbox, no acknowledgment of any kind — a creator can submit content having never seen those
  terms in-product. Also noticed while reviewing this flow: the submission form hardcodes
  `category_id: 1` and `type: "TUTORIAL"` with no picker UI at all (`handleSubmit` in the same
  file) — every creator submission is silently forced into category 1 regardless of actual
  topic, and would outright fail with "Invalid category_id" on any database where category 1
  doesn't exist. This isn't a security finding, but it means the Creator submission feature is
  less complete than its UI suggests.

---

## 7. What was fixed directly in this pass vs. what needs a decision

**Fixed directly** (unambiguous, low-risk, no behavior change beyond correctness):
1. `frontend/src/app/page.tsx` — root URL now redirects to `/news` instead of serving the
   Next.js scaffold. (§2.1)
2. `frontend/src/lib/json-ld.ts` (new) + both JSON-LD call sites in `news/page.tsx` and
   `news/[slug]/page.tsx` — escaped `<` in serialized JSON-LD to close the stored-XSS hole.
   (§2.2)
3. `frontend/src/app/(app)/creator/page.tsx` — added a `submitting` guard + disabled state to
   the "Submit new content" button, which previously had no protection against a double-click
   creating duplicate `Content`/`ContentSubmission` rows (same class of gap the Withdrawal and
   KYC forms already handled correctly).

**Reported, not fixed — needs a decision:**
- Withdrawal balance race condition / double-spend (§2.3) — money-boundary change, needs a
  locking-strategy decision.
- Referral/registration fraud path (§3.1) — needs a product decision on email
  requirements/verification.
- No login brute-force throttling (§3.2) — needs a rate decision.
- No server-side token revocation (§3.3) — auth-architecture change.
- Creator-submitted content `type` not validated (§3.4) — content-policy decision (which types
  should creators be allowed to pick?).
- No global default `permission_classes` (§4.1), no pagination (§4.2), hardcoded secret/config
  (§4.3), mobile nav coverage (§4.4), unused permission classes (§4.5), swallowed validation
  errors (§4.6) — all reported with suggested fixes above; none applied since each is either an
  infrastructure/settings change, a design decision, or touches multiple files beyond the
  "small, unambiguous" bar for a drive-by fix during an audit.
- All items in §6 (Gaps) are missing features by design or by omission, not bugs — listed for
  prioritization, not fixed.

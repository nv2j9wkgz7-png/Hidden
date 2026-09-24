# Buyer delivery

Buyers do not need an account. Successful payment opens clear originals and the image/video viewer. Unpaid visitors receive only generated previews.

Guest online access expires exactly 72 hours after the persisted `purchases.paid_at` timestamp. Reloading, copying a recovery link, requesting email, and replaying payment webhooks do not extend it. Missing payment timestamps fail closed. Full refunds revoke access. Existing downloaded files and email attachments cannot be revoked.

`/api/access` reports the deadline and EXPIRED status. `/api/media`, `/api/downloads`, and `/api/purchase-email` independently enforce the deadline and paid entitlement. Inline and download storage signatures last at most 60 seconds, capped by the remaining access time. The browser removes the paid gallery at expiration; it also rechecks payment status periodically.

Private purchase links identify a purchase but do not authorize a new browser. A new browser must verify a one-time code sent to the checkout email. The original checkout browser receives a separate signed HttpOnly proof; see PURCHASE-VERIFICATION.md. Original filenames and storage paths are not public authorization mechanisms.

Hidn no longer sends automatic buyer purchase emails from payment webhooks or the internal retry endpoint. Creator sale notifications remain automatic. Buyer email is explicitly requested through the paid drop and goes only to the checkout email address, never an arbitrary caller-provided recipient. ZIPs up to 15 MiB are attached with encoding headroom; larger collections receive a link to the paid page's ZIP download. Both templates state the original deadline. Requests are rate-limited and use request-specific provider idempotency keys. No real email should be sent just to run automated tests.

Optional accounts now provide a private `/purchases` library showing all saved media, grouped by collection with pagination. Guest checkout remains available. Logged-in checkout sets `buyer_id` server-side; guest buyers may claim a PAID purchase only after verifying its checkout email, before its original 72-hour deadline. Claims only update a null owner and cannot transfer an existing purchase to a different account.

Migration `20260924040000_saved_purchases.sql` adds optional buyer ownership and a lookup index. Purchase tables remain service-role-only. All library queries scope by verified authenticated user ID and serialize only safe metadata. Media/download authorization derives `account_access` server-side; owning accounts can access PAID purchases while files remain available, even after 72 hours. Refunds still revoke access. Guest token exchange never receives that exemption, even for a saved purchase. Storage signatures remain limited to 60 seconds.

Account purchase emails are opt-in and send the ZIP attachment when small enough; the fallback links to `/purchases` and requires login. No ongoing bearer link is issued. No public creator profile was added.

Verification: unit tests cover exact expiration, refunds, missing timestamps, signature lifetime, ZIP contents/size fallback and email formatting; payment orchestration verifies no automatic buyer send. Browser verification uses an existing sandbox purchase. Email delivery should be tested only when a buyer explicitly requests it.

## Optional recovery after guest access expires

`/purchases/recover` lets buyers request verification at their checkout email. It sends a verification email for every valid, rate-limited request, without looking up or exposing purchase existence. No automatic recovery emails or accounts are created. The 256-bit verification secret is delivered in a URL fragment, stripped in the browser, and exchanged for a short-lived HttpOnly cookie. Only its SHA-256 digest is stored in `purchase_recoveries`. Proofs expire after 30 minutes and are never usable as original-media access tokens.

After verification the buyer signs in or creates an account, sees the destination account, and explicitly clicks Add purchases to my account. The service-only `claim_recovered_purchases` transaction consumes the proof and claims only matching, previously paid purchases with no existing buyer. Matching normalizes case and surrounding spaces but does not remove email aliases or use wildcard matching. It excludes refunds, pending payments, missing payment timestamps, purchases made after the proof was issued, and existing account ownership. The same proof may retry only for the same account; it cannot transfer purchases. Concurrent claims recheck ownership under row locks. Guest `paid_at` and bearer deadlines do not change.

Request, verification, and claim endpoints enforce same-origin requests and rate limits. The database table and claim function are inaccessible to anonymous/authenticated API roles. Old expired proof records are pruned on subsequent successful requests. Users without access to their checkout mailbox cannot use self-service recovery. All testing uses mocked email delivery and local Postgres fixtures; real verification emails are sent only on user request.

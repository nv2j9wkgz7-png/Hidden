# Buyer delivery

Buyers do not need an account. Successful payment opens clear originals and the image/video viewer. Unpaid visitors receive only generated previews.

Online access expires exactly 72 hours after the persisted `purchases.paid_at` timestamp. Reloading, copying a recovery link, requesting email, and replaying payment webhooks do not extend it. Missing payment timestamps fail closed. Full refunds revoke access. Existing downloaded files and email attachments cannot be revoked.

`/api/access` reports the deadline and EXPIRED status. `/api/media`, `/api/downloads`, and `/api/purchase-email` independently enforce the deadline and paid entitlement. Inline and download storage signatures last at most 60 seconds, capped by the remaining access time. The browser removes the paid gallery at expiration; it also rechecks payment status periodically.

Private recovery links are bearer credentials: anyone holding one can access the purchase before its deadline. This is disclosed next to the save controls. Original filenames and storage paths are not public authorization mechanisms.

Hidn no longer sends automatic buyer purchase emails from payment webhooks or the internal retry endpoint. Creator sale notifications remain automatic. Buyer email is explicitly requested through the paid drop and goes only to the checkout email address, never an arbitrary caller-provided recipient. ZIPs up to 15 MiB are attached with encoding headroom; larger collections receive a link to the paid page's ZIP download. Both templates state the original deadline. Requests are rate-limited and use request-specific provider idempotency keys. No real email should be sent just to run automated tests.

No buyer account or public creator profile was added. Payment timestamps already exist, so this feature requires no database migration.

Verification: unit tests cover exact expiration, refunds, missing timestamps, signature lifetime, ZIP contents/size fallback and email formatting; payment orchestration verifies no automatic buyer send. Browser verification uses an existing sandbox purchase. Email delivery should be tested only when a buyer explicitly requests it.

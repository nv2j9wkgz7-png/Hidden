# Purchase browser verification

Guest checkout stays login-free. The checkout response installs an HttpOnly, Secure (production), SameSite=Lax signed browser proof, bound to the purchase and its access credential. Returning from payment on that browser does not require email verification. The signature uses EMAIL_ACCESS_SECRET with a separate purpose prefix; payment status, moderation, refunds and the 72-hour deadline are checked independently on every protected request.

A saved/emailed URL only identifies a purchase. Importing it sets a pending cookie and never establishes browser trust. New browsers request a six-digit code sent exclusively to the purchase's recorded customer_email. No arbitrary recipient is accepted or returned. Codes expire after ten minutes, are bound to the requesting browser challenge and purchase, and are atomically consumed once. Resend and guess budgets apply per purchase and IP; changing cookies or resending does not reset the purchase guess budget. Resend replaces the browser challenge, invalidating previous codes in that browser.

The existing service-role-only purchase_recoveries table stores these short-lived proofs. A domain-separated keyed HMAC of browser challenge, purchase and code is stored as token_hash, so neither a six-digit code nor a database dump is sufficient to redeem a proof. These hashes cannot be used as recovery-link tokens. No database migration is required.

Successful verification installs a signed browser proof including the checkout-email hash, expiring at the original paid_at + 72 hours. Saving an unclaimed purchase to an account requires this email proof; the claim update rechecks status, deadline, email and unclaimed ownership. The existing email-verified recovery flow remains available after the guest deadline. Purchases already owned by the authenticated account need no guest proof.

Previously issued bearer links and old browser cookies require verification after deployment. Existing account purchases continue through account authorization. Previously issued storage URLs retain their short existing lifetime (at most 60 seconds). Downloaded originals and ZIP attachments cannot be revoked or prevented from being forwarded.

Email codes are only sent after an explicit request. SMS is not configured or shown. EMAIL_ACCESS_SECRET must be at least 32 characters. Rotating it invalidates device proofs and outstanding codes; buyers can verify again. Do not log codes, private link tokens or cookie proofs.

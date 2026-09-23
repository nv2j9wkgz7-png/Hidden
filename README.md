# Hidn — payment-gated image drops (V0)

Next.js + TypeScript + Supabase Auth/Postgres/Storage + Stripe. Vercel-ready.

**Upload → set price → share link → buyer pays → originals unlock.**

Publishing opens an owner-only sharing page with a purchase link, editable message, SMS and WhatsApp sharing, Snapchat’s web share flow, and Instagram via the device share menu where supported (desktop fallback opens the inbox and copies the message). Multiple recipients are selected in the messaging app. Creators can explicitly preview the buyer page; opening their own drop otherwise returns to sharing. Localhost links only work on the development computer; configure `APP_URL` to the deployed address before sharing externally.

## What is implemented

- Email/password creator signup and login, email confirmation, logout, session refresh.
- Up to 20 JPEG/PNG/WebP images per drop; each file up to 10 MiB and 50 megapixels. Animated images are rejected.
- Private, immutable original uploads sent directly to Supabase, avoiding Vercel's request-body limit.
- Separate server-generated previews: decoded, reduced to 40px, enlarged/blurred, watermarked, re-encoded, and stripped of EXIF. CSS blur is not used.
- Saved drafts, interrupted-upload recovery, removal of draft images, title and USD price ($0.50–$1,000), immutable published drops, random share links.
- Stripe hosted checkout with cards, Apple Pay where Stripe makes it available, and optional Cash App Pay. Venmo is excluded.
- Only signed Stripe webhooks change payment state. Redirects never mark purchases paid.
- Private buyer access cookies and a copyable recovery link for another device. No buyer account required.
- Server-authorized 60-second original download URLs, individual downloads, and browser-generated ZIP downloads.
- Creator drop list, purchase count, and gross captured revenue before fees/refunds. Latest 100 drops shown.
- Durable checkout/download/create rate limits, row-level security, ownership checks, atomic payment event deduplication, full-refund revocation.

## Requirements

- Node.js 22 or newer, npm, Git.
- A Supabase project and a Stripe account (start in test mode).
- Chrome for the browser tests as configured. For CI without Chrome, install it with `npx playwright install --with-deps chrome`.

## Run locally

```sh
npm ci
cp .env.example .env.local
# Fill in .env.local as described below.
npm run dev
```

Open **http://localhost:3000**. Keep `APP_URL` identical to the browser's origin, including port. If opening `http://127.0.0.1:3000`, set `APP_URL=http://127.0.0.1:3000` instead.

The home page and setup screen render without credentials. Real auth, uploads, and payments need the services below. There is no fake-payment mode in the app.

For a production preview:

```sh
npm run build
npm run start
```

If this machine reports `EMFILE` watcher errors, use `WATCHPACK_POLLING=true npm run dev` or the production preview above. Do not run two development servers against the same checkout.

## Environment variables

| Variable                               | Where to obtain / value                                                                            | Browser-visible? |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                                               | Yes              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (legacy anon key also works)                                              | Yes              |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase service role key; server only                                                             | No               |
| `APP_URL`                              | Exact application origin, e.g. `http://localhost:3000` or your Vercel HTTPS URL                    | No               |
| `PAYMENT_PROVIDER`                     | `stripe`                                                                                           | No               |
| `STRIPE_SECRET_KEY`                    | Stripe test secret key, then live secret when ready                                                | No               |
| `STRIPE_WEBHOOK_SECRET`                | Signing secret for this specific endpoint; local CLI and deployed endpoints have different secrets | No               |
| `STRIPE_ENABLE_CASH_APP_PAY`           | `false` initially; `true` for an eligible account with Cash App Pay enabled                        | No               |

No Stripe publishable key is needed: checkout is hosted by Stripe. Never rename secret variables with a `NEXT_PUBLIC_` prefix. `.env.local`, `.env.*`, and Vercel metadata are ignored by Git; only `.env.example` is committed.

## Supabase setup

1. Create a project. Copy the project URL, publishable key, and service role key into `.env.local`.
2. Open **SQL Editor** and run the complete `supabase/migrations/20260922192409_initial.sql` once on a fresh project. It creates the six product/support tables, auth profile trigger, RLS policies, server-only functions, and both storage buckets. Alternatively initialize/link the Supabase CLI project and run `supabase db push`.
3. In **Authentication → Providers**, enable email/password. Keep email confirmation enabled; configure SMTP for reliable delivery outside initial testing.
4. Set the Auth Site URL to your app's origin and allow `http://localhost:3000/auth/callback` plus your deployed `https://YOUR_DOMAIN/auth/callback` as redirect URLs. Add the 127.0.0.1 version only if you use that origin locally.
5. Verify **Storage → originals** is **private** and **previews** is public. Do not add browser read, update, or insert policies for `originals`, and do not make it public.
6. Create an account in the app and confirm the email. Existing auth users are backfilled by the migration.

The migration assumes fresh `originals` and `previews` buckets and table names. If applying to an existing project with matching names, review existing policies first; don't weaken privacy to resolve a conflict.

## Stripe setup

1. Use a Stripe sandbox/test-mode secret key for development.
2. Run the Stripe CLI on your machine:

```sh
stripe login
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded \
  --forward-to localhost:3000/api/webhooks/stripe
```

3. Copy the CLI's `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`, then restart Next.js.
4. Hosted checkout explicitly allows `card`, plus `cashapp` only when `STRIPE_ENABLE_CASH_APP_PAY=true`. Apple Pay is part of Stripe's eligible card wallet experience, subject to the buyer's browser/device and account configuration. Cash App Pay requires an eligible Stripe account; leave the flag off until enabled. No Venmo or automatic expansion to other payment methods.
5. In deployment, create a Stripe webhook destination pointing to `https://YOUR_DOMAIN/api/webhooks/stripe` with the same three event types. Store that destination's signing secret in Vercel. Use the event API version matching the installed Stripe SDK (see `node_modules/stripe/cjs/apiVersion.js`) or a compatible snapshot event version.
6. Confirm webhook deliveries receive HTTP 200. Invalid signatures return 400. Processing/database errors return 500 so Stripe retries.

A checkout session belongs to one pending purchase. Resuming checkout reuses an open session. A completed session must wait for its webhook; it cannot grant access through a redirect or server retrieval. Expired sessions can be replaced. Failed or abandoned sessions remain PENDING and do not count as sales.

## Primary live test checklist (requires your credentials)

1. Start Next.js and `stripe listen`. Sign up, confirm email, and log in.
2. Create a drop with at least two images and a price of $1.00. Publish it, then copy its link from the dashboard.
3. Open the link in a separate/incognito browser. Only re-encoded previews should load. Inspect the network response: no original storage path or original signed URL is present. An unpaid POST to `/api/downloads` must return 403.
4. Start checkout. In **Stripe test mode only**, use `4242 4242 4242 4242`, any future expiry, any CVC, and the requested buyer email/address.
5. Observe the webhook's 200 response. The purchase must change from PENDING to PAID and the buyer page must unlock. Returning to the page without a valid webhook must leave it locked.
6. Download each original and the ZIP. Compare downloaded file bytes to your uploads; originals are not re-encoded. Save the private access link, open it in a different browser, and verify access restores.
7. Replay the checkout webhook from Stripe. Sales/revenue must not double-count.
8. Issue a **full refund in the Stripe dashboard**. After `charge.refunded`, new download requests must return 403. Already downloaded files cannot be recalled; previously issued links may last up to 60 seconds.
9. Repeat ownership checks with a second creator: they must not see or edit the first creator's drafts. Test upload interruption/retry and canceled-checkout resume.
10. Test Apple Pay and Cash App Pay separately on eligible devices/accounts before enabling them for customers.

`stripe trigger checkout.session.completed` alone does not create a matching app purchase and is not a substitute for this flow. Use checkout created by the app.

## Automated verification

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

- Node tests run the exact SQL migration in PGlite/Postgres, supplying only the Supabase platform's auth/storage schema scaffolding. They exercise draft → publish → PENDING → PAID → REFUNDED, ownership/RLS, amount/provider/currency matching, replay protection, and rate limits.
- Stripe tests use the real SDK to sign/verify fixture events and exercise normalization and forged/tampered/expired signatures. Checkout and refund lookup calls are stubbed; no charges are made.
- Sharp tests verify image decoding, metadata removal, preview dimensions, and invalid input rejection.
- Browser smoke tests cover desktop/mobile home navigation, setup gating, missing pages, and cross-origin API denial. They run the production build, reusing a running server if present. Their web-server origin is 127.0.0.1.
- These tests do **not** verify a real Supabase deployment, real object-store policies, email delivery, or a Stripe-hosted payment. The live checklist above remains required after credentials are supplied.

## Vercel deployment

1. Push this repository to your private Git host, then import it into Vercel as a **Next.js** project.
2. Set Node.js to 22+; use the default build command `npm run build` and output settings. No custom server or filesystem persistence is used.
3. Add every `.env.example` variable to Vercel's relevant environment. Set `APP_URL` to a stable HTTPS deployment domain. Public Supabase variables must exist at build time. Redeploy after changing them.
4. Add the Vercel callback URL in Supabase and the webhook endpoint/signing secret in Stripe.
5. Run the live test checklist in test mode before switching to live keys and a live-mode webhook destination.

Original uploads go directly from the browser to signed Supabase upload URLs. Preview generation runs in a Node function with a 60-second maximum duration; ensure your Vercel plan permits it. ZIP creation runs in the browser to avoid server response-size limits. At the maximum 200 MiB collection size, ZIP downloads need substantial browser memory; individual downloads are safer on low-memory devices.

All payments settle to the configured platform Stripe account. **Creator payouts/Stripe Connect are not implemented.** Do not describe the gross revenue dashboard as a payout balance.

## Architecture and security notes

- `src/lib/payments/types.ts`: provider contract (`createCheckout`, `getCheckout`, `verifyWebhook`, `refundPayment`).
- `src/lib/payments/stripe.ts`: Stripe-specific API calls and event normalization.
- `src/lib/payments/service.ts`: provider-neutral application of payment/refund events.
- `src/lib/payments/index.ts`: provider registry. Add a Segpay adapter and a signature-verifying webhook route here later. Historical purchases retain their provider name and use that provider when resumed.
- `supabase/migrations/…sql`: source of truth for tables, constraints, grants, atomic transitions, and storage privacy.
- `src/app/api/creator/*`: creator authentication, ownership validation, upload reservation, preview generation, draft removal, publishing.
- `src/app/api/access` and `downloads`: purchase-scoped bearer authorization. `purchases.access_token` contains only SHA-256 hashes of random 256-bit tokens.

Purchase status is exactly PENDING, PAID, or REFUNDED. Full refunds revoke future access; partial refunds retain access in V0. Payment and refund events are applied transactionally and deduplicated. A late success event never reverses REFUNDED. Refunds are initiated in Stripe's dashboard; there is no public refund endpoint.

Buyer recovery tokens travel in a URL fragment (not a query string) and are exchanged for HttpOnly, SameSite=Lax cookies. Fragments are removed from the address bar after exchange. Shareable drop links and private access links are different: anyone with a private access link can use the purchase. Save it before clearing browser data. Purchase recovery emails are available when Resend is configured (below).

Private URLs expire after 60 seconds. Original buckets have no browser RLS policies. The service role stays server-only. Mutations require the configured same origin; no cross-origin API access is enabled. Public pages serialize explicit preview-only projections, never full drop/asset/purchase rows. Access endpoints return `private, no-store` and pages use a no-referrer policy.

## Maintenance and limits

- Remove stale abandoned drafts and their storage objects only after confirming they are not published. Signed upload URLs last up to two hours; wait beyond this window before orphan cleanup. Removal may leave an orphan after a lost network response or concurrent upload; these files remain private.
- Periodically delete rate-limit rows older than a few days using a Supabase scheduled SQL job if traffic warrants it: `delete from public.rate_limits where window_start < now() - interval '7 days';`.
- Keep payment events and purchase records for reconciliation. Do not manually mark a purchase PAID as a checkout workaround.
- IP limiting uses Vercel's trusted forwarding header on Vercel. If hosting elsewhere, configure trusted proxy headers and edge rate limiting. Authentication has Supabase's own rate limits.
- Back up Supabase according to your data retention needs. Auth records, originals, previews, drops, and purchases live there; no application state depends on this laptop.
- No subscriptions, social features, payouts, storefronts, affiliates, or content-specific features are included.

## Continue on another computer

The source, lockfile, migrations, and this README are committed. Credentials must be transferred separately via a password manager or Vercel/Supabase/Stripe; never commit them.

If an `origin` remote is already configured:

```sh
git push -u origin main
# On the other computer:
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_DIRECTORY
npm ci
cp .env.example .env.local
# Restore credentials, then npm run dev.
```

If no remote is configured:

```sh
git remote add origin YOUR_PRIVATE_REPOSITORY_URL
git push -u origin main
```

A local commit alone cannot be pulled from another laptop. If a portable `.bundle` is provided with this handoff, transfer it and run `git clone hidden-v0.bundle hidden-image-drops` as an alternative. Then configure a shared remote. The bundle includes committed source and history, but no secrets, dependencies, or service data.

## Reference documentation

- [Supabase SSR auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [Stripe checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe Cash App Pay](https://docs.stripe.com/payments/cash-app-pay)

## Verified local Stripe setup

The complete sandbox payment/unlock/refund flow has passed. See [Stripe verification](docs/STRIPE_VERIFICATION.md). Restart webhook forwarding with `node --env-file=.env.local scripts/stripe-listen.mjs`, then run the app in another terminal. Credentials remain in ignored `.env.local`.

### Rich sharing

Published `/d/[slug]` pages expose Open Graph/Twitter metadata with title (including image count, total original file size, and price so apps that omit descriptions still receive those details), and a 1000×1000 JPEG at `/d/[slug]/card`. The square card uses the first **separate safe preview asset** with an additional blur and the Hidn H watermark; it never reads originals. Unpublished or invalid drops return 404. The same card appears on the creator share page and can be downloaded. Instagram sharing supplies the card as a file when the device supports it. Messaging apps control whether they retain text, URLs, or display rich previews; verify on target phones after deploying to a publicly reachable HTTPS URL.

WhatsApp/SMS prefill the composed message. Snapchat’s documented web share URL accepts the purchase URL and opens its recipient flow, but does not accept a prefilled caption. Instagram has no equivalent general web DM composer URL: supported devices use the system share sheet, where the user selects Instagram; other browsers open Instagram with an explicit copy/paste fallback. No messages are sent automatically.

References: [Snapchat share flow](https://developers.snap.com/api/snapchat-for-web/social-plugins/share-link-to-snapchat), [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share). Social logo SVGs in `public/social` are from [Simple Icons](https://simpleicons.org/) (CC0; respective brand trademarks remain with their owners).

### Stop sales and creator viewing

Dashboard cards show separate blurred previews behind the H watermark; they never receive originals. Opening a published drop shows an owner-only gallery using original URLs signed for 60 seconds. Original storage paths are never serialized as standalone fields to the gallery client.

Creators can select **Stop sales** and confirm from their drop page. `CLOSING` immediately blocks checkout creation and resumption; the server expires every registered unpaid checkout through the payment-provider abstraction, then marks the drop `CLOSED`. Failed expiration leaves the drop in `CLOSING` with a retry control. Checkout creation rechecks the sales state and expires its session before returning a link if closure occurred concurrently. The database trigger serializes purchase reservations with changes to the drop state. Completed or already-processing payments are honored; paid purchases and recovery links retain original-file access. No images or purchases are deleted, and this action does not refund payments.

Apply `supabase/migrations/20260922213000_stop_sales.sql` after the initial migration. The live Supabase project has this migration applied. Regression coverage checks that CLOSING/CLOSED prevent new reservations without revoking PAID access. A sandbox integration check also verified expiration of an actual open Stripe Checkout Session and retained downloads for a simulated paid entitlement.

### Purchase emails (Resend)

After the payment event is validated and committed, Hidn sends the checkout email address a private return link. The email contains the drop title, amount paid, and a “View my images” button. It does not attach originals or expose storage URLs. Email links use a separate HMAC-derived token; only its hash is stored, and existing checkout cookies still work. Every download checks PAID status, so refunds revoke both types of access and stopping sales preserves them.

Setup:

1. Apply `supabase/migrations/20260922230000_purchase_email.sql` after the other migrations (already applied to the current Supabase project).
2. Create a [Resend account](https://resend.com/signup), add a sending domain you own, and add the DNS records Resend provides. Use a subdomain such as `mail.your-domain.com` if preferred. Verify the domain in Resend.
3. Create a sending API key and save it as `RESEND_API_KEY` in `.env.local` and your hosting environment. Set `EMAIL_FROM` to `Hidn <purchases@mail.your-domain.com>` using your verified domain.
4. Generate two independent secrets with `openssl rand -hex 32`, saving them as `EMAIL_ACCESS_SECRET` and `EMAIL_RETRY_SECRET`. Keep them in a password manager and use the same values on every deployment. Do not commit them. Keep EMAIL_ACCESS_SECRET stable; changing it changes tokens generated for unsent/retried messages.
5. Set `APP_URL` to the public HTTPS Hidn origin, and redeploy/restart. Email delivery deliberately refuses HTTP URLs. Localhost is not a usable destination for buyers.
6. Disable click and open tracking for the sending domain: private access links should not be rewritten or tracked. Make a sandbox purchase with your own email address and open the email on another browser/device. Verify download access, stop-sales retention, and refund revocation.

Missing email configuration leaves checkout/unlock working and messages unsent. Once configured, backfill up to five unsent PAID purchases per invocation:

```sh
node --env-file=.env.local scripts/retry-purchase-emails.mjs
```

The operator endpoint is `POST /api/internal/purchase-emails`, protected by EMAIL_RETRY_SECRET. It accepts no custom recipient or link. Repeat to drain a backlog; it reports only counts. No scheduler is required for normal delivery: email failures return a webhook error so Stripe retries, while the committed purchase stays unlocked. Use the retry script after webhook retries are exhausted or to backfill purchases made before configuration.

`email_sent_at` means Resend accepted the message, not guaranteed inbox delivery; inspect Resend for bounces. A stable per-purchase idempotency key prevents concurrent/retried sends within Resend's 24-hour window. The durable sent marker skips later webhooks. In the rare case where Resend accepts a message but persisting the sent marker fails, a retry after 24 hours can duplicate the email; reconcile the provider ID/logs before retrying such a failure. Keep sender, APP_URL, and email template stable during retries inside that window, because Resend rejects a changed payload under the same key.

Validation uses mocked email delivery plus Postgres authorization/payment tests; actual inbox delivery requires the setup above. References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

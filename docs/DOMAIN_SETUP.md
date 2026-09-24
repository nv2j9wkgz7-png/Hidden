# Hidn domain setup

Domain: `sendhidn.com`, registered through Namecheap on September 23, 2026.
The application brand is Hidn; the existing GitHub repository remains `nv2j9wkgz7-png/Hidden`.

## Email

Resend verified `sendhidn.com` on September 23, 2026. Namecheap Advanced DNS contains:

- TXT `resend._domainkey`: the public DKIM value provided by Resend.
- CNAME `rsend`: `rsend.forge.rmta.net`.
- CNAME `send`: `send.forge.rmta.net`.
- TXT `_dmarc`: `v=DMARC1; p=none;`.

These are the records supplied by this Resend account; do not replace them with generic examples. Sending is enabled in Resend, receiving is disabled, and tracking has not been configured.

Production application sender: `Hidn <purchases@sendhidn.com>`.
The local app still uses its localhost APP_URL. Automatic purchase emails are enabled in Vercel. The local app remains without EMAIL_FROM to avoid sending localhost links. Secrets are stored only in ignored local files and Vercel environment variables.

### Password recovery

The login screen links to `/forgot-password`. Supabase sends a recovery email through its own authentication email configuration, independently of the application's Resend purchase emails. Recovery exchanges the PKCE code at `/auth/callback`, then opens `/reset-password`. Users must open the link in the browser that requested it. Missing, expired, or already-used links have a retry path; responses do not confirm whether an account exists.

Custom SMTP was enabled and verified to persist in Supabase on September 23. It uses `smtp.resend.com`, port `465`, username `resend`, and a Resend sending API key stored by Supabase as the SMTP password. Authentication emails send as `Hidn <team@sendhidn.com>`. A real inbox-to-reset flow still needs verification. Never commit the SMTP password or log reset links.

## Web hosting

Vercel project `hidn/hidden` is connected to the existing GitHub repository and deployed from `main`. The active team is Hidn (currently a Pro trial); the old suspended `dre6` team is not used.

- Public URL: https://sendhidn.com
- Vercel alias: https://hidden-neon.vercel.app
- Namecheap A record `@`: `216.198.79.1`, as supplied by Vercel.
- Production and Preview environment variables are configured. The two `NEXT_PUBLIC_SUPABASE_*` variables use Vercel Config; all other variables are server secrets.
- `APP_URL=https://sendhidn.com` and `EMAIL_FROM=Hidn <purchases@sendhidn.com>` in Vercel. Local settings remain local.
- Supabase Site URL is `https://sendhidn.com`; its redirect allowlist includes `https://sendhidn.com/auth/callback` and both existing localhost callbacks.
- Stripe sandbox webhook: `https://sendhidn.com/api/webhooks/stripe`, with a dedicated signing secret. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.

## Deployment checks

The first Vercel production build succeeded. HTTPS home, login, and the existing buyer drop page return 200. An unsigned Stripe webhook returns 400. The deployed checkout endpoint creates a Stripe test-mode checkout with a sendhidn.com return URL; that unpaid smoke-test checkout was expired afterward. Resend accepted a test email from the verified sender to the account owner's email.

A completed payment and recovery-email download flow on the public domain still needs a final end-to-end check. Payments remain sandbox-only; creator payouts and live-money launch are deferred. Do not reuse the local Stripe CLI webhook secret in Vercel.

# Hidn domain setup

Domain: `sendhidn.com`, registered through Namecheap on September 23, 2026.
The application brand is Hidn; the existing GitHub repository remains `nv2j9wkgz7-png/Hidden`.

## Email

Added `sendhidn.com` to Resend and submitted verification. Namecheap Advanced DNS contains:

- TXT `resend._domainkey`: the public DKIM value provided by Resend.
- CNAME `rsend`: `rsend.forge.rmta.net`.
- CNAME `send`: `send.forge.rmta.net`.
- TXT `_dmarc`: `v=DMARC1; p=none;`.

These are the records supplied by this Resend account; do not replace them with generic examples. Sending is enabled in Resend, receiving is disabled, and tracking has not been configured.

Intended application sender after verification/deployment: `Hidn <purchases@sendhidn.com>`.
The local app still uses its localhost APP_URL. Keep automatic purchase emails disabled until the public app is reachable. The Resend API key and email secrets are in ignored `.env.local` and must be transferred securely into the deployment environment.

## Web hosting — pending

The signed-in Vercel team `dre` (`dre6`) currently reports that it is suspended. No Hidn project exists in that team. Deployment needs an active authorized Vercel team; no subscription or billing changes have been made.

The domain's existing web parking/redirect records remain in place until the app is deployed. After deployment:

1. Add `sendhidn.com` to the Vercel project and use the DNS values Vercel supplies. Replace the default parking/redirect records as appropriate; retain the email DNS records above.
2. Configure runtime secrets and `APP_URL=https://sendhidn.com`; public Supabase values are needed at build time.
3. Add `https://sendhidn.com/auth/callback` to Supabase's redirect allowlist and set the public site URL.
4. Create the deployed Stripe sandbox webhook at `https://sendhidn.com/api/webhooks/stripe`, with its own signing secret (not the local CLI secret).
5. Once Resend is verified, set EMAIL_FROM and verify a sandbox purchase, received email, and downloads from another device. Creator payouts and live-money launch remain deferred.

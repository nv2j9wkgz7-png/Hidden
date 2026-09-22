# Stripe sandbox verification — September 22, 2026

Hidden sandbox account `acct_1UIZNXRqzpWlclzC` was verified using the application's test secret key. No real money moved. Creator payouts remain deferred.

Passed against the running production build, real Supabase project, and Stripe sandbox:

- Creator authentication, drop creation, two signed image uploads, separate preview generation, and publishing.
- Public preview access; private original URLs blocked; unpaid download endpoint returned 403.
- $5 hosted Checkout using Stripe's documented sandbox Visa card.
- Actual `checkout.session.completed` delivered through Stripe CLI to the app with HTTP 200; purchase became PAID.
- Buyer browser returned to Hidden and displayed Payment confirmed and download controls.
- Both full-resolution original files downloaded through signed URLs.
- Replaying the actual completed event with a locally generated test signature did not duplicate the sale: one sale, 500 cents gross.
- Full sandbox refund succeeded; actual `charge.refunded` webhook changed the purchase to REFUNDED; downloads returned 403.

Apple Pay was visible in Checkout but was not exercised. Cash App Pay is enabled locally and its full sandbox checkout → webhook PAID → two original downloads flow passed. The US sandbox reports Cash App Pay available. Link also displayed funding options in Stripe's hosted checkout. The app itself requests card payments; Stripe's Link configuration can affect the hosted options.

## Restart local payment testing

Keep `.env.local` private. The application secret key and local listener signing secret are configured there on this computer. They are not committed or included in the Git bundle.

In terminal 1, from the repository:

```sh
node --env-file=.env.local scripts/stripe-listen.mjs
```

The helper launches the official Stripe CLI, saves its signing secret to `.env.local` without printing it, and tells you if the app needs a restart. It refuses live keys.

In terminal 2:

```sh
npm run build
npm start
```

Leave both processes running while testing. For production, configure a public HTTPS webhook destination, its separate signing secret, production environment variables, and the deployed Supabase auth callback. A localhost listener is not a deployment.

Official test-card documentation: https://docs.stripe.com/testing

## Hosting status

Git is initialized and all completed work is committed locally. No GitHub repository or Git remote has been created; the Git bundle is an offline transfer copy, not a hosted backup. GitHub and Vercel sign-in are required before publishing a sandbox deployment.

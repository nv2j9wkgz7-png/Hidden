# Stripe integration plan and review

Reviewed September 22, 2026 against the existing implementation and Stripe's authenticated `stripe_implementation_planner`.

## Connection

- Claude plugin installation was attempted and failed on Claude settings filesystem permissions.
- Official Stripe MCP fallback is configured in `.codex/config.toml`; OAuth login succeeded.
- Authorized environment: Hidden sandbox (`acct_1UIZNXRqzpWlclzC`), read-only. No live account authorized.
- Planner was called through authenticated MCP because this task's loaded tool catalog had not refreshed. Guide: `iguide_61VRxQJyJThuadM4h41RqzpWlclzC`.
- The planner returned a draft Connect decision tree. It has not been accepted as a final business configuration: seller locations, fee and responsibility model remain unresolved. The user chose to finish payment/unlock testing first and defer creator payouts.
- MCP OAuth is not an application API key. Runtime `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are still required.

## Current V0 review

The existing adapter uses hosted Checkout in one-time payment mode with server-controlled USD amounts and purchase metadata. It verifies raw webhook signatures, checks paid status, and normalizes events through the provider interface. Database application validates the purchase/provider/session/amount/currency, deduplicates events atomically and prevents late paid events from reversing a refund. Originals unlock through server-side purchase checks. These are appropriate foundations to retain.

Cards are enabled, Cash App Pay is explicitly configurable, and Venmo is excluded. Keep the explicit payment-method allowlist for this scope rather than adopting the planner's generic conversion suggestions that could expand accepted methods or currencies.

The implementation currently charges the platform account. It does not create connected accounts, route creator proceeds, or charge application fees. It is not a completed Connect integration and should not be presented as ready for independent creator payments.

## Connect decisions and implementation sequence

1. Resolve scope: finish sandbox payment/unlock testing first, or add creator onboarding and Connect routing now. Original V0 excluded creator payouts.
2. Resolve whether buyers purchase directly from creators using Hidden as software or through Hidden as a marketplace. The planner routes these toward direct charges and destination charges respectively. Do not silently choose financial responsibility for the owner.
3. Confirm platform/seller countries and any per-sale fee. No subscriptions, multi-seller carts or delayed transfers are required by the brief.
4. Add a provider-neutral seller payment-account model with provider account ID, onboarding/capability state, and environment. Keep Stripe details in its adapter.
5. Use Stripe-managed onboarding; validate creator ownership before generating onboarding links. Verify capabilities server-side before checkout. An onboarding redirect alone is not proof of readiness.
6. Implement the selected charge model. For direct charges, retain connected-account context for Checkout retrieval, refunds and webhook matching. For destination charges, retain destination and fee snapshots and define transfer/application-fee refund handling.
7. Extend purchase/event identity to include provider account context and test/live environment. Validate it before changing access. Keep webhook event deduplication and purchase-level locking.
8. Test successful, delayed, failed, duplicated and refunded payments in the sandbox. Confirm unpaid/other-creator access remains denied, signed URLs expire, and dashboard totals remain correct.

## Immediate payment setup

Use an application secret key from the same Hidden sandbox, stored only in ignored `.env.local` (and later deployment environment settings). Start a Stripe CLI listener forwarding `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded` to `/api/webhooks/stripe`; save its signing secret. Complete a real sandbox Checkout created by Hidden, verify webhook-driven PAID status and original downloads, replay the event, then test a full refund.

For deployment, use a public HTTPS webhook URL and that destination's own signing secret. Add the deployed Supabase auth callback. Do not reuse a CLI listener signing secret for production.

## Suggested hardening before launch

- Add explicit environment/account checks to incoming payment events and the stored purchase, especially before Connect support.
- Make initial checkout creation resilient to concurrent requests and failures between session creation and persistence. The current idempotency key is per new purchase; separate initial requests can create separate purchases/sessions before the cookie is returned.
- Add alerting for repeated webhook failures and document dispute handling. Do not silently map disputes to refunds without a product decision.

## References

- https://docs.stripe.com/mcp
- https://docs.stripe.com/connect/direct-charges
- https://docs.stripe.com/connect/destination-charges
- https://docs.stripe.com/checkout/fulfillment

## Payment setup completed

Sandbox API credentials and the local webhook listener are now configured. Checkout, webhook-driven unlock, original downloads, duplicate-event handling and full-refund revocation passed. See `docs/STRIPE_VERIFICATION.md` for results and restart instructions. Production deployment and creator payouts remain outside this completed sandbox setup.

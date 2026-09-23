import assert from 'node:assert/strict';
import { sendPurchaseEmail } from '../../src/lib/email/service';
import { paymentSucceeded } from '../../src/lib/payments/service';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.RESEND_API_KEY = 'test-key';
process.env.EMAIL_FROM = 'Hidn <purchases@example.com>';
process.env.EMAIL_ACCESS_SECRET = 'a'.repeat(48);
process.env.APP_URL = 'https://hidden.example';
const purchase = {
  id: 'purchase-1',
  drop_id: 'drop-1',
  status: 'PENDING',
  amount_cents: 100,
  customer_email: 'buyer@example.com',
  email_sent_at: null as string | null,
  email_access_token: '',
};
let sends = 0,
  fail = false,
  applied = false;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.hostname === 'api.resend.com') {
    assert.equal(purchase.status, 'PAID');
    assert.match(purchase.email_access_token, /^[a-f0-9]{64}$/);
    sends++;
    return fail
      ? new Response('', { status: 503 })
      : Response.json({ id: 'email-1' });
  }
  assert.equal(url.hostname, 'database.example');
  if (url.pathname.endsWith('/rpc/apply_payment_event')) {
    purchase.status = 'PAID';
    const first = !applied;
    applied = true;
    return Response.json(first);
  }
  if (url.pathname.endsWith('/drops'))
    return Response.json({ title: 'Test', slug: 'test' });
  assert.ok(url.pathname.endsWith('/purchases'));
  if (options?.method === 'PATCH') {
    const update = JSON.parse(String(options.body));
    if (update.email_access_token) {
      assert.equal(url.searchParams.get('status'), 'eq.PAID');
      assert.equal(url.searchParams.get('email_sent_at'), 'is.null');
      Object.assign(purchase, update);
      return Response.json([{ id: purchase.id }]);
    }
    Object.assign(purchase, update);
    return new Response(null, { status: 204 });
  }
  return Response.json([purchase]);
};
assert.equal(await sendPurchaseEmail(purchase.id), 'skipped');
assert.equal(sends, 0);
const event = {
  eventId: 'event-1',
  purchaseId: purchase.id,
  transactionId: 'checkout-1',
  amountCents: 100,
  currency: 'usd',
  kind: 'paid' as const,
  customerEmail: purchase.customer_email,
};
fail = true;
await assert.rejects(paymentSucceeded('stripe', event), /503/);
assert.equal(purchase.status, 'PAID');
assert.equal(purchase.email_sent_at, null);
fail = false;
await paymentSucceeded('stripe', event); // Duplicate webhook retries the failed delivery.
assert.ok(purchase.email_sent_at);
assert.equal(sends, 2);
await paymentSucceeded('stripe', event);
assert.equal(sends, 2); // Durable marker suppresses later duplicates.
purchase.status = 'REFUNDED';
assert.equal(await sendPurchaseEmail(purchase.id), 'skipped');
assert.equal(sends, 2);
process.env.RESEND_API_KEY = '';
assert.equal(await sendPurchaseEmail(purchase.id), 'disabled');
console.log('Payment/email retry and entitlement checks passed');

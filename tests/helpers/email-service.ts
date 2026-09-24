import assert from 'node:assert/strict';
import { sendPurchaseEmail } from '../../src/lib/email/service';
import { sendSaleEmail } from '../../src/lib/email/sale';
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
const notice = {
  id: purchase.id,
  creator_id: '11111111-1111-4111-8111-111111111111',
  title: 'A sale',
  amount_cents: 100,
  email_sent_at: null as string | null,
};
let saleSends = 0,
  failSale = false;
let sends = 0,
  fail = false,
  applied = false;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.hostname === 'api.resend.com') {
    assert.equal(purchase.status, 'PAID');
    const body = JSON.parse(String(options?.body));
    if (body.to[0] === 'creator@example.com') {
      assert.equal(
        new Headers(options?.headers).get('Idempotency-Key'),
        `creator-sale/${purchase.id}`,
      );
      assert.equal(body.subject, 'Your drop sold · Hidn');
      assert.ok(!body.text.includes('access='));
      saleSends++;
      return failSale
        ? new Response('', { status: 503 })
        : Response.json({ id: 'sale-email-1' });
    }
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
  if (url.pathname.endsWith('/sale_notifications')) {
    if (options?.method === 'PATCH') {
      Object.assign(notice, JSON.parse(String(options.body)));
      return new Response(null, { status: 204 });
    }
    return Response.json(
      applied ? [{ ...notice, purchases: { status: purchase.status } }] : [],
    );
  }
  if (
    url.pathname.endsWith('/admin/users/11111111-1111-4111-8111-111111111111')
  )
    return Response.json({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'creator@example.com',
    });
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
failSale = true;
await assert.rejects(paymentSucceeded('stripe', event), /503/);
assert.equal(purchase.status, 'PAID');
assert.equal(purchase.email_sent_at, null);
assert.equal(sends, 0); // Never email the buyer automatically.
failSale = false;
await paymentSucceeded('stripe', event);
assert.ok(notice.email_sent_at);
assert.equal(saleSends, 2);
await paymentSucceeded('stripe', event);
assert.equal(saleSends, 2); // Durable marker suppresses duplicate creator emails.
assert.equal(sends, 0);
purchase.status = 'REFUNDED';
notice.email_sent_at = null;
assert.equal(await sendSaleEmail(purchase.id), 'skipped');
assert.equal(saleSends, 2);
assert.equal(await sendPurchaseEmail(purchase.id), 'skipped');
assert.equal(sends, 0);
process.env.RESEND_API_KEY = '';
assert.equal(await sendPurchaseEmail(purchase.id), 'disabled');
console.log('Payment/email retry and entitlement checks passed');

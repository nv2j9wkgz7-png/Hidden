import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { StripeProvider, InvalidWebhook } from '../src/lib/payments/stripe';
const secret = 'whsec_local_unit_test_only';
const sdk = new Stripe('sk_test_local_unit_test_only');
function event(type: string, object: unknown) {
  const body = JSON.stringify({
    id: 'evt_test',
    object: 'event',
    type,
    data: { object },
  });
  return {
    body,
    headers: new Headers({
      'stripe-signature': sdk.webhooks.generateTestHeaderString({
        payload: body,
        secret,
      }),
    }),
  };
}
const session = {
  id: 'cs_test',
  mode: 'payment',
  payment_status: 'paid',
  metadata: { purchase_id: '87ec9fbc-dfb8-428b-8d9b-5f703d5b32d4' },
  amount_total: 1250,
  currency: 'usd',
  customer_details: { email: 'buyer@example.com' },
};
test('a signed paid checkout normalizes to a provider-independent payment event', async () => {
  const provider = new StripeProvider('sk_test_local_unit_test_only', secret);
  for (const type of [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
  ]) {
    const e = event(type, session);
    const normalized = await provider.verifyWebhook(e.body, e.headers);
    assert.deepEqual(normalized, {
      eventId: 'evt_test',
      purchaseId: session.metadata.purchase_id,
      transactionId: 'cs_test',
      amountCents: 1250,
      currency: 'usd',
      kind: 'paid',
      customerEmail: 'buyer@example.com',
    });
  }
});
test('unpaid completion and unrelated products cannot unlock purchases', async () => {
  const provider = new StripeProvider('sk_test_local_unit_test_only', secret);
  for (const object of [
    { ...session, payment_status: 'unpaid' },
    { ...session, metadata: {} },
    { ...session, mode: 'subscription' },
  ]) {
    const e = event('checkout.session.completed', object);
    assert.equal(await provider.verifyWebhook(e.body, e.headers), null);
  }
});
test('forged, tampered, and stale webhook signatures are rejected', async () => {
  const provider = new StripeProvider('sk_test_local_unit_test_only', secret);
  const e = event('checkout.session.completed', session);
  await assert.rejects(
    provider.verifyWebhook(e.body, new Headers()),
    InvalidWebhook,
  );
  await assert.rejects(
    provider.verifyWebhook(e.body.replace('1250', '1'), e.headers),
    InvalidWebhook,
  );
  const stale = new Headers({
    'stripe-signature': sdk.webhooks.generateTestHeaderString({
      payload: e.body,
      secret,
      timestamp: 1,
    }),
  });
  await assert.rejects(provider.verifyWebhook(e.body, stale), InvalidWebhook);
});
test('full refunds normalize to revocation and partial refunds retain access', async () => {
  const provider = new StripeProvider('sk_test_local_unit_test_only', secret);
  const fake = provider as unknown as {
    stripe: {
      checkout: { sessions: { list: () => Promise<{ data: unknown[] }> } };
    };
  };
  fake.stripe.checkout.sessions.list = async () => ({ data: [session] });
  const full = event('charge.refunded', {
    amount: 1250,
    amount_refunded: 1250,
    refunded: true,
    payment_intent: 'pi_test',
  });
  assert.equal(
    (await provider.verifyWebhook(full.body, full.headers))?.kind,
    'refunded',
  );
  const partial = event('charge.refunded', {
    amount: 1250,
    amount_refunded: 500,
    refunded: false,
    payment_intent: 'pi_test',
  });
  assert.equal(
    await provider.verifyWebhook(partial.body, partial.headers),
    null,
  );
});
test('checkout restricts payment methods and supplies price from its server input', async () => {
  for (const cashApp of [false, true]) {
    const provider = new StripeProvider(
      'sk_test_local_unit_test_only',
      secret,
      cashApp,
    );
    let captured: Record<string, unknown> = {};
    const fake = provider as unknown as {
      stripe: {
        checkout: {
          sessions: {
            create: (
              a: Record<string, unknown>,
              b: unknown,
            ) => Promise<unknown>;
          };
        };
      };
    };
    fake.stripe.checkout.sessions.create = async (a, b) => {
      captured = { a, b };
      return { id: 'cs_test', url: 'https://checkout.stripe.com/test' };
    };
    await provider.createCheckout({
      purchaseId: 'purchase',
      title: 'Collection',
      amountCents: 1250,
      currency: 'usd',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });
    assert.deepEqual(
      (captured.a as { payment_method_types: string[] }).payment_method_types,
      cashApp ? ['card', 'cashapp'] : ['card'],
    );
    assert.deepEqual(captured.b, { idempotencyKey: 'checkout:purchase' });
  }
});

test('checkout resume distinguishes open, completed, expired, and unknown states', async () => {
  const provider = new StripeProvider('sk_test_local_unit_test_only', secret);
  const fake = provider as unknown as {
    stripe: { checkout: { sessions: { retrieve: () => Promise<unknown> } } };
  };
  for (const status of ['open', 'complete', 'expired']) {
    fake.stripe.checkout.sessions.retrieve = async () => ({
      status,
      url: status === 'open' ? 'https://checkout.stripe.com/test' : null,
    });
    assert.equal((await provider.getCheckout('cs_test')).status, status);
  }
  fake.stripe.checkout.sessions.retrieve = async () => ({
    status: 'unrecognized',
    url: null,
  });
  await assert.rejects(
    provider.getCheckout('cs_test'),
    /Unknown checkout state/,
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emailAccessToken,
  purchaseEmail,
  sendEmail,
} from '../src/lib/email/message';
import { validToken } from '../src/lib/security';

test('email tokens are stable for retries, secret-bound, and purchase-specific', () => {
  const secret = 'a'.repeat(48);
  const token = emailAccessToken('purchase-1', secret);
  assert.ok(validToken(token));
  assert.equal(token, emailAccessToken('purchase-1', secret));
  assert.notEqual(token, emailAccessToken('purchase-2', secret));
  assert.notEqual(token, emailAccessToken('purchase-1', 'b'.repeat(48)));
  assert.throws(() => emailAccessToken('purchase-1', 'short'));
});

test('email escapes creator text and includes a fragment link in both formats', () => {
  const url = 'https://hidden.example/d/test#access=private-token';
  const email = purchaseEmail({
    title: '<img src=x onerror=alert(1)> & "Title"',
    amountCents: 1250,
    url,
  });
  assert.ok(!email.html.includes('<img'));
  assert.ok(email.html.includes('&lt;img'));
  assert.ok(email.html.includes('&amp; &quot;Title&quot;'));
  assert.ok(email.html.includes(url));
  assert.ok(email.text.includes(url));
  assert.ok(email.text.includes('$12.50 USD'));
  assert.ok(email.text.includes('No Hidn account needed'));
});

test('email transport uses purchase idempotency and never treats a provider failure as sent', async () => {
  const input = {
    apiKey: 'test-key',
    from: 'Hidn <test@example.com>',
    to: 'buyer@example.com',
    purchaseId: 'purchase-1',
    message: purchaseEmail({
      title: 'Test',
      amountCents: 100,
      url: 'https://hidden.example/d/test#access=secret',
    }),
  };
  let previousBody: unknown;
  const mockFetch: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(
      new Headers(options?.headers).get('Idempotency-Key'),
      'purchase-email/purchase-1',
    );
    assert.equal(
      new Headers(options?.headers).get('Authorization'),
      'Bearer test-key',
    );
    if (previousBody) assert.equal(options?.body, previousBody);
    previousBody = options?.body;
    assert.deepEqual(JSON.parse(options?.body as string).to, [
      'buyer@example.com',
    ]);
    return Response.json({ id: 'email-1' });
  };
  assert.equal(await sendEmail(input, mockFetch), 'email-1');
  assert.equal(await sendEmail(input, mockFetch), 'email-1');
  await assert.rejects(
    sendEmail(
      input,
      async () => new Response('sensitive body', { status: 429 }),
    ),
    /HTTP 429/,
  );
  await assert.rejects(
    sendEmail(input, async () => Response.json({})),
    /message ID/,
  );
});

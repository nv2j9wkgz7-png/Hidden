import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessPurchase,
  purchaseExpiresAt,
  purchaseViewStatus,
  originalLinkLifetime,
  PURCHASE_ACCESS_MS,
} from '../src/lib/purchase-window';
import { emailArchive, EMAIL_ZIP_LIMIT } from '../src/lib/email/archive';
import { unzipSync } from 'fflate';
import { requestedPurchaseEmail, sendEmail } from '../src/lib/email/message';

test('all original access ends exactly 72 hours after payment and cannot renew', () => {
  const paid = {
    status: 'PAID',
    drop_id: 'drop-a',
    paid_at: '2026-09-24T00:00:00Z',
  };
  const start = Date.parse(paid.paid_at),
    end = start + PURCHASE_ACCESS_MS;
  assert.equal(purchaseExpiresAt(paid), '2026-09-27T00:00:00.000Z');
  assert.equal(canAccessPurchase(paid, 'drop-a', end - 1), true);
  assert.equal(canAccessPurchase(paid, 'drop-a', end), false);
  assert.equal(canAccessPurchase(paid, 'drop-a', end + 86400000), false);
  assert.equal(canAccessPurchase(paid, 'other-drop', start), false);
  for (const status of ['PENDING', 'REFUNDED'])
    assert.equal(
      canAccessPurchase({ ...paid, status }, 'drop-a', start),
      false,
    );
  for (const paid_at of [null, undefined, 'invalid'])
    assert.equal(
      canAccessPurchase({ ...paid, paid_at }, 'drop-a', start),
      false,
    );
  assert.equal(purchaseViewStatus(paid, end), 'EXPIRED');
  assert.equal(
    purchaseViewStatus({ ...paid, status: 'REFUNDED' }, end),
    'REFUNDED',
  );
  assert.equal(originalLinkLifetime(paid, end - 10000), 10);
  assert.equal(originalLinkLifetime(paid, end), 0);
  assert.equal(originalLinkLifetime(paid, start), 60);
});

test('email ZIP preserves originals with safe unique names and falls back above the limit', async () => {
  const files = [0, 1].map((sort_order) => ({
    storage_path: String(sort_order),
    original_filename: '../photo.jpg',
    sort_order,
    size_bytes: 3,
  }));
  const zip = await emailArchive(files, async () => new Uint8Array([1, 2, 3]));
  assert.ok(zip);
  const unpacked = unzipSync(zip);
  assert.deepEqual(Object.keys(unpacked), ['01-_photo.jpg', '02-_photo.jpg']);
  assert.deepEqual([...Object.values(unpacked)[0]], [1, 2, 3]);
  const again = await emailArchive(
    files,
    async () => new Uint8Array([1, 2, 3]),
  );
  assert.deepEqual(zip, again); // Same retry must use the same provider payload.
  let read = false;
  assert.equal(
    await emailArchive(
      [{ ...files[0], size_bytes: EMAIL_ZIP_LIMIT + 1 }],
      async () => {
        read = true;
        return new Uint8Array();
      },
    ),
    null,
  );
  assert.equal(read, false);
  assert.equal(
    await emailArchive(files, async () => new Uint8Array(EMAIL_ZIP_LIMIT)),
    null,
  );
});

test('requested email includes the original deadline and optional ZIP attachment', async () => {
  for (const attached of [true, false]) {
    const message = requestedPurchaseEmail({
      title: '<private>',
      url: 'https://hidden.example/d/test#access=token',
      expiresAt: '2026-09-27T00:00:00Z',
      attached,
    });
    assert.ok(message.text.includes('72 hours after payment'));
    assert.ok(message.text.includes('does not extend access'));
    assert.ok(!message.html.includes('<private>'));
    assert.ok(
      message.text.includes(
        attached ? 'ZIP is attached' : 'too large to attach',
      ),
    );
    await sendEmail(
      {
        apiKey: 'test',
        from: 'team@example.com',
        to: 'buyer@example.com',
        idempotencyKey: 'explicit-request/test',
        message,
        ...(attached
          ? { attachments: [{ filename: 'files.zip', content: 'AQID' }] }
          : {}),
      },
      async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        assert.equal(!!body.attachments, attached);
        if (attached) assert.equal(body.attachments[0].content, 'AQID');
        return Response.json({ id: 'sent' });
      },
    );
  }
});

test('only authenticated saved ownership bypasses the guest deadline, never refunds', () => {
  const purchase = {
    status: 'PAID',
    drop_id: 'a',
    paid_at: '2026-01-01T00:00:00Z',
    account_access: true,
  };
  const later = Date.parse('2026-02-01T00:00:00Z');
  assert.equal(canAccessPurchase(purchase, 'a', later), true);
  assert.equal(purchaseViewStatus(purchase, later), 'PAID');
  assert.equal(originalLinkLifetime(purchase, later), 60);
  assert.equal(purchaseExpiresAt(purchase), '2026-01-04T00:00:00.000Z');
  assert.equal(
    canAccessPurchase({ ...purchase, account_access: false }, 'a', later),
    false,
  );
  assert.equal(
    canAccessPurchase({ ...purchase, status: 'REFUNDED' }, 'a', later),
    false,
  );
  assert.equal(
    canAccessPurchase({ ...purchase, paid_at: null }, 'a', later),
    false,
  );
  assert.equal(canAccessPurchase(purchase, 'another-drop', later), false);
});

test('saved purchase email requires login and never promises a permanent guest link', () => {
  const message = requestedPurchaseEmail({
    title: 'Saved',
    url: 'https://sendhidn.com/purchases',
    expiresAt: null,
    attached: false,
    accountAccess: true,
  });
  assert.match(message.text, /requires the account/);
  assert.match(message.text, /Log in to My purchases/);
  assert.doesNotMatch(message.text, /#access|No Hidn account needed|72 hours/);
});

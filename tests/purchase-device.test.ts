import assert from 'node:assert/strict';
import test from 'node:test';
import {
  signDeviceProof,
  readDeviceProof,
  verificationCodeHash,
} from '../src/lib/purchase-device';
import { hashToken } from '../src/lib/security';
const secret = 's'.repeat(48),
  raw = 'a'.repeat(43),
  now = Date.now();
test('browser proofs bind purchase, credential, signature and deadline', () => {
  const proof = signDeviceProof('purchase-1', raw, now + 1000, secret);
  assert.ok(readDeviceProof(proof, 'purchase-1', raw, secret, now));
  assert.equal(readDeviceProof(proof, 'purchase-2', raw, secret, now), null);
  assert.equal(
    readDeviceProof(proof, 'purchase-1', 'b'.repeat(43), secret, now),
    null,
  );
  assert.equal(
    readDeviceProof(proof, 'purchase-1', raw, secret, now + 1000),
    null,
  );
  assert.equal(
    readDeviceProof(proof, 'purchase-1', raw, 'x'.repeat(48), now),
    null,
  );
  assert.equal(
    readDeviceProof(proof + '.extra', 'purchase-1', raw, secret, now),
    null,
  );
  assert.equal(readDeviceProof(raw, 'purchase-1', raw, secret, now), null);
  assert.equal(
    readDeviceProof(undefined, 'purchase-1', raw, secret, now),
    null,
  );
});
test('checkout proof cannot be forged into an email verification proof', () => {
  const proof = signDeviceProof('p', raw, now + 1000, secret);
  assert.equal(readDeviceProof(proof, 'p', raw, secret, now)?.email, undefined);
  const [payload, signature] = proof.split('.');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
  parsed.email = hashToken('buyer@example.com');
  const forged = `${Buffer.from(JSON.stringify(parsed)).toString('base64url')}.${signature}`;
  assert.equal(readDeviceProof(forged, 'p', raw, secret, now), null);
  const verified = signDeviceProof(
    'p',
    raw,
    now + 1000,
    secret,
    ' Buyer@Example.com ',
  );
  assert.equal(
    readDeviceProof(verified, 'p', raw, secret, now)?.email,
    hashToken('buyer@example.com'),
  );
});
test('verification codes require the browser challenge, purchase and server key', () => {
  const hash = verificationCodeHash(raw, 'p', '001234', secret);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(
    hash,
    verificationCodeHash('b'.repeat(43), 'p', '001234', secret),
  );
  assert.notEqual(hash, verificationCodeHash(raw, 'other', '001234', secret));
  assert.notEqual(
    hash,
    verificationCodeHash(raw, 'p', '001234', 'x'.repeat(48)),
  );
  assert.notEqual(hash, hashToken('001234'));
  assert.throws(() => signDeviceProof('p', raw, now, 'short'));
});

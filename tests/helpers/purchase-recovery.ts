import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { hashToken } from '../../src/lib/security';
import { RECOVERY_COOKIE } from '../../src/lib/purchase-recovery';
const jar = new Map<string, string>();
mock.module('next/headers', {
  namedExports: {
    cookies: async () => ({
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      get: (name: string) =>
        jar.has(name) ? { value: jar.get(name) } : undefined,
      set: (name: string, value: string) => jar.set(name, value),
    }),
  },
});
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.RESEND_API_KEY = 'test-mail';
process.env.EMAIL_FROM = 'Hidn <team@example.com>';
process.env.APP_URL = 'https://hidn.example';
const buyer = crypto.randomUUID();
let proof:
  | { token_hash: string; email: string; expires_at: string; used_at?: string }
  | undefined;
let outbox: { to: string[]; text: string } | undefined;
let sent = 0,
  allowRate = true,
  claimCalls = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === 'api.resend.com') {
    outbox = JSON.parse(String(init?.body));
    sent++;
    return Response.json({ id: 'test-message' });
  }
  assert.equal(url.hostname, 'database.example');
  if (url.pathname === '/auth/v1/user')
    return Response.json({ id: buyer, email: 'account@example.com' });
  if (url.pathname.endsWith('/rpc/consume_rate_limit'))
    return Response.json(allowRate);
  if (url.pathname.endsWith('/rpc/claim_recovered_purchases')) {
    claimCalls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.p_buyer_id, buyer);
    assert.equal(body.p_token_hash, proof!.token_hash);
    return Response.json(2);
  }
  // Requesting verification must never query purchase records or create auth users.
  assert.ok(url.pathname.endsWith('/purchase_recoveries'), url.pathname);
  if (init?.method === 'POST') {
    proof = {
      ...JSON.parse(String(init.body)),
      expires_at: new Date(Date.now() + 1800000).toISOString(),
    };
    return new Response(null, { status: 201 });
  }
  if (init?.method === 'DELETE') return new Response(null, { status: 204 });
  assert.equal(url.searchParams.get('used_at'), 'is.null');
  assert.ok(url.searchParams.get('expires_at')?.startsWith('gt.'));
  const matches =
    proof &&
    url.searchParams.get('token_hash') === `eq.${proof.token_hash}` &&
    !proof.used_at &&
    Date.parse(proof.expires_at) > Date.now();
  return Response.json(matches ? [proof] : []);
};
const { POST: request } =
  await import('../../src/app/api/purchases/recover/request/route');
const { POST: verify } =
  await import('../../src/app/api/purchases/recover/verify/route');
const { POST: claim } =
  await import('../../src/app/api/purchases/recover/claim/route');
const post = (body: unknown, origin = 'https://hidn.example') =>
  new Request('https://hidn.example/api/test', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
assert.equal((await request(post({ email: 'invalid' }))).status, 400);
assert.equal(sent, 0);
assert.equal(
  (await request(post({ email: 'buyer@example.com' }, 'https://other.example')))
    .status,
  403,
);
assert.equal(
  (await request(post({ email: ' Buyer@Example.com ' }))).status,
  200,
);
assert.deepEqual(outbox!.to, ['buyer@example.com']);
assert.equal(sent, 1);
assert.equal(proof!.email, 'buyer@example.com');
const link = outbox!.text.match(/https:\/\/hidn\.example\/\S+/)![0];
const token = new URLSearchParams(new URL(link).hash.slice(1)).get('verify')!;
assert.ok(token);
assert.equal(hashToken(token), proof!.token_hash);
assert.equal(new URL(link).search, '');
assert.equal((await claim(post({ token }))).status, 401); // Mailbox proof never logs someone in.
assert.equal((await verify(post({ token: 'x'.repeat(43) }))).status, 403);
const verification = await verify(post({ token }));
assert.equal(verification.status, 200);
const cookie = verification.headers.get('set-cookie')!;
assert.match(cookie, /HttpOnly/i);
assert.match(cookie, /SameSite=lax/i);
assert.doesNotMatch(cookie, /Max-Age=31536000/);
const exp = Math.floor(Date.now() / 1000) + 3600;
const payload = Buffer.from(JSON.stringify({ sub: buyer, exp })).toString(
  'base64url',
);
jar.set(
  'sb-database-auth-token',
  `base64-${Buffer.from(JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test', expires_at: exp, token_type: 'bearer', user: { id: buyer } })).toString('base64url')}`,
);
assert.equal(
  (await claim(post({ email: 'buyer@example.com', token }))).status,
  403,
); // Body values can't replace the proof cookie.
jar.set(RECOVERY_COOKIE, token);
assert.equal(
  (await claim(post({ buyer_id: crypto.randomUUID() }))).status,
  200,
);
assert.equal(claimCalls, 1);
proof!.expires_at = '2000-01-01T00:00:00Z';
assert.equal((await verify(post({ token }))).status, 403);
proof!.expires_at = new Date(Date.now() + 1800000).toISOString();
proof!.used_at = new Date().toISOString();
assert.equal((await verify(post({ token }))).status, 403);
allowRate = false;
assert.equal((await request(post({ email: 'buyer@example.com' }))).status, 429);
assert.equal(sent, 1);
assert.equal((await verify(post({ token }))).status, 429);
console.log(
  'Recovery request, verification, session ownership, expired proof and rate-limit checks passed',
);

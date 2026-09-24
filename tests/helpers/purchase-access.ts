import assert from 'node:assert/strict';
import { mock } from 'node:test';
import {
  deviceCookie,
  pendingCookie,
  challengeCookie,
  signDeviceProof,
} from '../../src/lib/purchase-device';
import { hashToken, accessCookie } from '../../src/lib/security';
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
process.env.APP_URL = 'https://hidn.example';
process.env.EMAIL_ACCESS_SECRET = 's'.repeat(48);
process.env.RESEND_API_KEY = 'test-mail';
process.env.EMAIL_FROM = 'Hidn <team@example.com>';
const alice = crypto.randomUUID(),
  bob = crypto.randomUUID();
const drop = crypto.randomUUID(),
  guestDrop = crypto.randomUUID(),
  expiredDrop = crypto.randomUUID();
const asset = crypto.randomUUID();
const raw = 'a'.repeat(43),
  guestRaw = 'b'.repeat(43),
  expiredRaw = 'c'.repeat(43);
const ago = (hours: number) =>
  new Date(Date.now() - hours * 3600000).toISOString();
const rows = [
  {
    id: crypto.randomUUID(),
    drop_id: drop,
    buyer_id: alice,
    status: 'PAID',
    customer_email: 'checkout@example.com',
    paid_at: ago(100),
    access_token: hashToken(raw),
  },
  {
    id: crypto.randomUUID(),
    drop_id: guestDrop,
    buyer_id: null as string | null,
    status: 'PAID',
    customer_email: 'checkout@example.com',
    paid_at: ago(1),
    access_token: hashToken(guestRaw),
  },
  {
    id: crypto.randomUUID(),
    drop_id: expiredDrop,
    buyer_id: null as string | null,
    status: 'PAID',
    customer_email: 'checkout@example.com',
    paid_at: ago(100),
    access_token: hashToken(expiredRaw),
  },
];
function login(id?: string) {
  jar.delete('sb-database-auth-token');
  if (!id) return;
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(
    JSON.stringify({ sub: id, exp: expires }),
  ).toString('base64url');
  const session = {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`,
    refresh_token: 'test',
    expires_at: expires,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id, email: 'buyer@example.com' },
  };
  jar.set(
    'sb-database-auth-token',
    `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
  );
}
type CodeProof = {
  token_hash: string;
  email: string;
  expires_at: string;
  used_at?: string;
};
const proofs: CodeProof[] = [];
let outbox: { to: string[]; text: string } | undefined;
let allowRate = true;
let mailFailure = false;
let signatures = 0;
let moderationState = 'ACTIVE';
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === 'api.resend.com') {
    outbox = JSON.parse(String(init?.body));
    return mailFailure
      ? new Response('provider error', { status: 503 })
      : Response.json({ id: 'mail-test' });
  }
  assert.equal(url.hostname, 'database.example'); // No real accounts, payments, or emails.
  const headers = new Headers(init?.headers);
  if (url.pathname === '/auth/v1/user') {
    const token = headers.get('authorization')!.split(' ')[1];
    const { sub } = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    return Response.json({ id: sub, email: 'buyer@example.com' });
  }
  if (url.pathname.endsWith('/rpc/consume_rate_limit'))
    return Response.json(allowRate);
  if (url.pathname.includes('/storage/v1/object/sign/')) {
    assert.equal(JSON.parse(String(init?.body)).expiresIn, 60);
    signatures++;
    return Response.json({
      signedURL: '/object/sign/originals/private.jpg?token=temporary',
    });
  }
  const single = headers.get('accept')?.includes('vnd.pgrst.object');
  if (url.pathname.endsWith('/drops'))
    return Response.json([
      {
        moderation_state: moderationState,
        creator_id: alice,
        status: 'PUBLISHED',
        users: { creator_suspended: false },
      },
    ]);
  if (url.pathname.endsWith('/moderation_admins')) return Response.json([]);
  if (url.pathname.endsWith('/assets')) {
    assert.equal(url.searchParams.get('drop_id'), `eq.${drop}`);
    return Response.json(
      single
        ? {
            id: asset,
            storage_path: 'private.jpg',
            sort_order: 0,
            original_filename: 'photo.jpg',
          }
        : [
            {
              id: asset,
              storage_path: 'private.jpg',
              sort_order: 0,
              original_filename: 'photo.jpg',
            },
          ],
    );
  }
  if (url.pathname.endsWith('/purchase_recoveries')) {
    if (init?.method === 'POST') {
      proofs.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 201 });
    }
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    assert.equal(init?.method, 'PATCH');
    assert.equal(url.searchParams.get('used_at'), 'is.null');
    const matched = proofs.filter(
      (p) =>
        url.searchParams.get('token_hash') === `eq.${p.token_hash}` &&
        url.searchParams.get('email') === `eq.${p.email}` &&
        !p.used_at &&
        Date.parse(p.expires_at) > Date.now(),
    );
    matched.forEach((p) => Object.assign(p, JSON.parse(String(init?.body))));
    return Response.json(matched);
  }
  assert.ok(url.pathname.endsWith('/purchases'), url.pathname);
  const selected = rows.filter((row) =>
    [...url.searchParams].every(([key, value]) => {
      if (['select', 'order', 'limit'].includes(key)) return true;
      if (key === 'or')
        return value.includes(`access_token.eq.${row.access_token}`);
      const field = row[key as keyof typeof row];
      if (value === 'is.null') return field === null;
      if (value.startsWith('eq.')) return String(field) === value.slice(3);
      if (key === 'paid_at' && value.startsWith('gt.'))
        return Date.parse(String(field)) > Date.parse(value.slice(3));
      throw new Error(`Unhandled query filter ${key}`);
    }),
  );
  if (init?.method === 'PATCH') {
    assert.equal(url.searchParams.get('buyer_id'), 'is.null');
    assert.equal(url.searchParams.get('status'), 'eq.PAID');
    assert.ok(url.searchParams.get('paid_at')?.startsWith('gt.'));
    selected.forEach((row) =>
      Object.assign(row, JSON.parse(String(init.body))),
    );
  }
  return Response.json(single ? selected[0] : selected);
};
const { purchaseAccess } = await import('../../src/lib/access');
const { GET: access, POST: exchange } =
  await import('../../src/app/api/access/route');
const { GET: media } = await import('../../src/app/api/media/route');
const { POST: download } = await import('../../src/app/api/downloads/route');
const { POST: requestCode } =
  await import('../../src/app/api/access/code/request/route');
const { POST: verifyCode } =
  await import('../../src/app/api/access/code/verify/route');
const { POST: save } = await import('../../src/app/api/purchases/save/route');
const get = (path: string) => new Request(`https://hidn.example${path}`);
const post = (body: unknown) =>
  new Request('https://hidn.example/api/test', {
    method: 'POST',
    headers: {
      origin: 'https://hidn.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
login(alice);
assert.equal((await purchaseAccess(drop))?.account_access, true);
const saved = await (
  await access(get(`/api/access?drop_id=${drop}&recovery=1`))
).json();
assert.equal(saved.status, 'PAID');
assert.equal(saved.account_saved, true);
assert.equal(saved.expires_at, null);
assert.equal(saved.library_url, '/purchases');
assert.equal(saved.token, undefined);
assert.equal(
  (await media(get(`/api/media?drop_id=${drop}&asset_id=${asset}`))).status,
  307,
);
assert.equal((await download(post({ drop_id: drop }))).status, 200);
assert.equal(signatures, 2);
login();
// Exchanging the same purchase's old bearer link never grants the account exemption.
assert.equal(
  (await (await exchange(post({ drop_id: drop, token: raw }))).json()).status,
  'EXPIRED',
);
login(bob);
assert.equal(await purchaseAccess(drop), null);
assert.equal(
  (
    await media(
      get(`/api/media?drop_id=${drop}&asset_id=${asset}&account_access=true`),
    )
  ).status,
  403,
);
assert.equal(
  (await download(post({ drop_id: drop, account_access: true }))).status,
  403,
);
assert.equal(signatures, 2);
login();
jar.set(accessCookie(guestDrop), guestRaw);
assert.equal((await save(post({ drop_id: guestDrop }))).status, 401);
// A legacy raw cookie is no longer authorization, and a copied URL cannot
// install the device proof or fetch any original file.
assert.equal(await purchaseAccess(guestDrop), null);
let forwarded = await exchange(post({ drop_id: guestDrop, token: guestRaw }));
assert.equal((await forwarded.json()).status, 'VERIFICATION_REQUIRED');
assert.ok(
  !forwarded.headers.get('set-cookie')?.includes(`${deviceCookie(guestDrop)}=`),
);
assert.equal((await download(post({ drop_id: guestDrop }))).status, 403);
assert.equal(
  (await media(get(`/api/media?drop_id=${guestDrop}&asset_id=${asset}`)))
    .status,
  403,
);
const blockedLink = await (
  await access(get(`/api/access?drop_id=${guestDrop}&recovery=1`))
).json();
assert.equal(blockedLink.status, 'VERIFICATION_REQUIRED');
assert.equal(blockedLink.token, undefined);

// The actual checkout browser has a separately signed cookie, which URLs do
// not carry. It can view, but cannot claim a guest purchase before email proof.
jar.set(
  deviceCookie(guestDrop),
  signDeviceProof(
    rows[1].id,
    guestRaw,
    Date.now() + 86400000,
    process.env.EMAIL_ACCESS_SECRET!,
  ),
);
assert.equal((await purchaseAccess(guestDrop))?.account_access, false);
assert.equal((await purchaseAccess(guestDrop))?.email_verified, false);
login(alice);
assert.equal(
  (await (await save(post({ drop_id: guestDrop }))).json())
    .verification_required,
  true,
);
assert.equal(rows[1].buyer_id, null);
jar.delete(deviceCookie(guestDrop));
assert.equal(
  (await (await save(post({ drop_id: guestDrop }))).json())
    .verification_required,
  true,
);
assert.equal(rows[1].buyer_id, null);

function acceptCookies(response: Response) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const at = pair.indexOf('=');
    const name = pair.slice(0, at),
      value = decodeURIComponent(pair.slice(at + 1));
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}
login();
acceptCookies(forwarded);
let response = await requestCode(
  post({ drop_id: guestDrop, email: 'attacker@example.com' }),
);
assert.equal(response.status, 200);
acceptCookies(response);
assert.deepEqual(outbox!.to, ['checkout@example.com']);
const code = outbox!.text.match(/code is (\d{6})/)![1];
const challenge = jar.get(challengeCookie(guestDrop))!;
assert.ok(challenge);
assert.ok(!proofs[0].token_hash.includes(code));
assert.equal(
  (
    await verifyCode(
      post({
        drop_id: guestDrop,
        code: code === '000000' ? '111111' : '000000',
      }),
    )
  ).status,
  403,
);
assert.equal(proofs[0].used_at, undefined);
// Codes are bound to the requesting browser, not just to a known purchase URL.
jar.set(challengeCookie(guestDrop), 'z'.repeat(43));
assert.equal(
  (await verifyCode(post({ drop_id: guestDrop, code }))).status,
  403,
);
jar.set(challengeCookie(guestDrop), challenge);
allowRate = false;
assert.equal(
  (await verifyCode(post({ drop_id: guestDrop, code }))).status,
  429,
);
assert.equal((await requestCode(post({ drop_id: guestDrop }))).status, 429);
allowRate = true;
response = await verifyCode(post({ drop_id: guestDrop, code }));
assert.equal(response.status, 200);
assert.match(response.headers.get('set-cookie')!, /HttpOnly/i);
assert.match(response.headers.get('set-cookie')!, /SameSite=lax/i);
acceptCookies(response);
assert.ok(proofs[0].used_at);
assert.equal(jar.has(challengeCookie(guestDrop)), false);
assert.equal((await purchaseAccess(guestDrop))?.email_verified, true);
// Even restoring old cookies cannot redeem a consumed code a second time.
jar.set(challengeCookie(guestDrop), challenge);
assert.equal(
  (await verifyCode(post({ drop_id: guestDrop, code }))).status,
  403,
);
jar.delete(challengeCookie(guestDrop));

login(alice);
const paidAt = rows[1].paid_at;
assert.equal((await save(post({ drop_id: guestDrop }))).status, 200);
assert.equal(rows[1].buyer_id, alice);
assert.equal(rows[1].paid_at, paidAt);
assert.equal((await save(post({ drop_id: guestDrop }))).status, 200);
login(bob);
assert.equal((await save(post({ drop_id: guestDrop }))).status, 409);
jar.set(accessCookie(expiredDrop), expiredRaw);
assert.equal((await save(post({ drop_id: expiredDrop }))).status, 403);
jar.set(pendingCookie(expiredDrop), expiredRaw);
assert.equal((await requestCode(post({ drop_id: expiredDrop }))).status, 403);
// Expired code and provider failure never install a device proof.
login();
jar.set(pendingCookie(guestDrop), guestRaw);
response = await requestCode(post({ drop_id: guestDrop }));
acceptCookies(response);
const expiredCode = outbox!.text.match(/code is (\d{6})/)![1];
proofs.at(-1)!.expires_at = new Date(Date.now() - 1).toISOString();
assert.equal(
  (await verifyCode(post({ drop_id: guestDrop, code: expiredCode }))).status,
  403,
);
mailFailure = true;
assert.equal((await requestCode(post({ drop_id: guestDrop }))).status, 503);
mailFailure = false;
// Cross-origin code sends are rejected before any email is sent.
assert.equal(
  (
    await requestCode(
      new Request('https://hidn.example/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://evil.example',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ drop_id: guestDrop }),
      }),
    )
  ).status,
  403,
);
login(alice);
rows[0].status = 'REFUNDED';
assert.equal(
  (await media(get(`/api/media?drop_id=${drop}&asset_id=${asset}`))).status,
  403,
);
assert.equal((await download(post({ drop_id: drop }))).status, 403);
assert.equal(signatures, 2);
console.log(
  'Saved purchase ownership, guest expiry, refund, media/download and claim API checks passed',
);

rows[0].status = 'PAID';
login(alice);
moderationState = 'REMOVED';
assert.equal(
  (await (await access(get(`/api/access?drop_id=${drop}`))).json()).status,
  'UNAVAILABLE',
);
assert.equal(
  (await media(get(`/api/media?drop_id=${drop}&asset_id=${asset}`))).status,
  403,
);
assert.equal((await download(post({ drop_id: drop }))).status, 403);
const { GET: adminMedia } = await import('../../src/app/api/admin/media/route');
assert.equal(
  (await adminMedia(get(`/api/admin/media?drop_id=${drop}&asset_id=${asset}`)))
    .status,
  403,
);
login();
assert.equal(
  (await adminMedia(get(`/api/admin/media?drop_id=${drop}&asset_id=${asset}`)))
    .status,
  401,
);

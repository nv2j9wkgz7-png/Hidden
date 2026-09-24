import assert from 'node:assert/strict';
import { mock } from 'node:test';
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
    paid_at: ago(100),
    access_token: hashToken(raw),
  },
  {
    id: crypto.randomUUID(),
    drop_id: guestDrop,
    buyer_id: null as string | null,
    status: 'PAID',
    paid_at: ago(1),
    access_token: hashToken(guestRaw),
  },
  {
    id: crypto.randomUUID(),
    drop_id: expiredDrop,
    buyer_id: null as string | null,
    status: 'PAID',
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
let signatures = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
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
    return Response.json(true);
  if (url.pathname.includes('/storage/v1/object/sign/')) {
    assert.equal(JSON.parse(String(init?.body)).expiresIn, 60);
    signatures++;
    return Response.json({
      signedURL: '/object/sign/originals/private.jpg?token=temporary',
    });
  }
  const single = headers.get('accept')?.includes('vnd.pgrst.object');
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

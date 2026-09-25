import assert from 'node:assert/strict';
import { mock } from 'node:test';
const jar = new Map<string, string>();
mock.module('next/headers', {
  namedExports: {
    cookies: async () => ({
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      set: () => {},
    }),
  },
});
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.APP_URL = 'https://hidn.example';
const owner = crypto.randomUUID(),
  dropId = crypto.randomUUID(),
  assetId = crypto.randomUUID();
let viewer: string | undefined;
let selected = true,
  ready = true,
  suspended = false;
let status = 'PUBLISHED',
  moderation = 'ACTIVE';
let signed = 0,
  writes = 0;
function login(id?: string) {
  viewer = id;
  jar.clear();
  if (!id) return;
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(
    JSON.stringify({ sub: id, exp: expires }),
  ).toString('base64url');
  jar.set(
    'sb-database-auth-token',
    `base64-${Buffer.from(JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test', expires_at: expires, expires_in: 3600, token_type: 'bearer', user: { id } })).toString('base64url')}`,
  );
}
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.hostname, 'database.example');
  if (url.pathname === '/auth/v1/user') return Response.json({ id: viewer });
  if (url.pathname.endsWith('/users'))
    return Response.json({ creator_suspended: suspended });
  if (url.pathname.endsWith('/assets')) {
    assert.equal(url.searchParams.get('is_public_preview'), 'eq.true');
    assert.equal(url.searchParams.get('status'), 'eq.READY');
    assert.equal(url.searchParams.get('id'), `eq.${assetId}`);
    return Response.json(
      selected && ready
        ? { drop_id: dropId, storage_path: 'private/selected-file' }
        : null,
    );
  }
  if (url.pathname.endsWith('/drops'))
    return Response.json({
      id: dropId,
      creator_id: owner,
      status,
      moderation_state: moderation,
      users: { creator_suspended: suspended },
    });
  if (url.pathname.includes('/storage/v1/object/sign/')) {
    signed++;
    assert.match(url.pathname, /originals\/private\/selected-file$/);
    assert.equal(JSON.parse(String(init?.body)).expiresIn, 60);
    return Response.json({
      signedURL: '/object/sign/originals/private/selected-file?token=test',
    });
  }
  if (url.pathname.endsWith('/rpc/set_public_previews')) {
    writes++;
    return new Response(null, { status: 204 });
  }
  throw Error(`Unexpected request ${url.pathname}`);
};
const { GET } = await import('../../src/app/api/public-preview/route');
const { POST } = await import('../../src/app/api/creator/public-preview/route');
const get = () =>
  GET(
    new Request(`https://hidn.example/api/public-preview?asset_id=${assetId}`),
  );
let response = await get();
assert.equal(response.status, 307);
assert.match(response.headers.get('location')!, /token=test/);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
assert.equal(signed, 1);
for (const state of ['DRAFT', 'CLOSED', 'CLOSING']) {
  status = state;
  assert.equal((await get()).status, 404);
}
status = 'PUBLISHED';
for (const state of ['PAUSED', 'REMOVED']) {
  moderation = state;
  assert.equal((await get()).status, 404);
}
moderation = 'ACTIVE';
suspended = true;
assert.equal((await get()).status, 404);
suspended = false;
selected = false;
assert.equal((await get()).status, 404);
selected = true;
ready = false;
assert.equal((await get()).status, 404);
ready = true;
assert.equal(signed, 1);
status = 'DRAFT';
login(crypto.randomUUID());
assert.equal((await get()).status, 404);
login(owner);
assert.equal((await get()).status, 307);
assert.equal(signed, 2);
const post = (confirmed = false, origin = 'https://hidn.example') =>
  POST(
    new Request('https://hidn.example/api/creator/public-preview', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        drop_id: dropId,
        asset_ids: [assetId],
        confirmed,
      }),
    }),
  );
assert.equal((await post(true, 'https://evil.example')).status, 403);
assert.equal((await post(false)).status, 400);
assert.equal(writes, 0);
assert.equal((await post(true)).status, 200);
assert.equal(writes, 1);
login();
assert.equal((await post(true)).status, 401);
assert.equal(writes, 1);

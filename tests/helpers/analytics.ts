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
  drop = crypto.randomUUID(),
  visitor = crypto.randomUUID();
let viewer: string | undefined,
  found = true,
  limit = true;
const records: Record<string, string>[] = [];
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
  if (url.pathname.endsWith('/rpc/consume_rate_limit'))
    return Response.json(limit);
  if (url.pathname.endsWith('/drops')) {
    assert.equal(url.searchParams.get('moderation_state'), 'neq.REMOVED');
    return Response.json(found ? [{ creator_id: owner }] : []);
  }
  if (url.pathname.endsWith('/rpc/record_drop_view')) {
    records.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: 204 });
  }
  throw Error(`Unexpected request ${url.pathname}`);
};
const { POST } = await import('../../src/app/api/analytics/view/route');
const session = crypto.randomUUID();
const req = (
  body: unknown = { drop_id: drop, session },
  origin = 'https://hidn.example',
  ua = 'Mozilla/5.0',
) =>
  new Request(`${origin}/api/analytics/view`, {
    method: 'POST',
    headers: {
      origin,
      'user-agent': ua,
      'content-type': 'application/json',
      'x-forwarded-for': '192.0.2.1',
    },
    body: JSON.stringify(body),
  });
assert.equal((await POST(req({}, 'https://evil.example'))).status, 403);
assert.equal((await POST(req({ drop_id: drop, session: 'bad' }))).status, 400);
assert.equal((await POST(req(undefined, undefined, 'Googlebot'))).status, 200);
assert.equal(records.length, 0);
login(owner);
await POST(req());
assert.equal(records.length, 0);
login(visitor);
assert.equal((await POST(req())).status, 200);
assert.equal(records.length, 1);
assert.deepEqual(Object.keys(records[0]).sort(), ['p_drop', 'p_session']);
assert.equal(records[0].p_drop, drop);
assert.match(records[0].p_session, /^[a-f0-9]{64}$/);
assert.notEqual(records[0].p_session, session);
login();
assert.equal((await POST(req())).status, 200);
assert.equal(records.length, 2);
assert.equal(records[0].p_session, records[1].p_session);
found = false;
await POST(req());
assert.equal(records.length, 2);
limit = false;
assert.equal((await POST(req())).status, 429);

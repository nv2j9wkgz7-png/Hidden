import assert from 'node:assert/strict';
import { mock } from 'node:test';
mock.module('next/headers', {
  namedExports: { cookies: async () => ({ getAll: () => [], set: () => {} }) },
});
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.APP_URL = 'https://hidn.example';
const drop = crypto.randomUUID();
let exists = true,
  duplicate = false,
  limited = false;
const inserts: Record<string, unknown>[] = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.hostname, 'database.example');
  if (url.pathname.endsWith('/rpc/consume_rate_limit'))
    return Response.json(!limited);
  if (url.pathname.endsWith('/drops'))
    return Response.json(exists ? [{ id: drop }] : []);
  if (url.pathname.endsWith('/content_reports') && init?.method === 'POST') {
    inserts.push(JSON.parse(String(init.body)));
    return duplicate
      ? Response.json({ code: '23505', message: 'duplicate' }, { status: 409 })
      : new Response(null, { status: 201 });
  }
  throw new Error(`Unexpected database write/read: ${url.pathname}`);
};
const { POST: report } = await import('../../src/app/api/reports/route');
const { POST: moderate } =
  await import('../../src/app/api/admin/moderate/route');
const request = (data: unknown, origin = 'https://hidn.example') =>
  new Request(`${origin}/api/reports`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-forwarded-for': '192.0.2.7',
    },
    body: JSON.stringify(data),
  });
const data = {
  drop_id: drop,
  category: 'OTHER',
  details: 'This needs a careful review.',
  contact_email: '',
  priority: 0,
  status: 'RESOLVED',
};
assert.equal((await report(request(data, 'https://evil.example'))).status, 403);
assert.equal(inserts.length, 0);
assert.equal(
  (await report(request({ ...data, details: 'short' }))).status,
  400,
);
assert.deepEqual(await (await report(request(data))).json(), {
  received: true,
});
assert.equal(inserts.length, 1);
assert.equal(inserts[0].priority, 2);
assert.equal(inserts[0].contact_email, null);
assert.equal(inserts[0].status, undefined);
assert.match(String(inserts[0].reporter_key), /^[a-f0-9]{64}$/);
duplicate = true;
assert.deepEqual(await (await report(request(data))).json(), {
  received: true,
});
assert.equal(inserts[0].reporter_key, inserts[1].reporter_key);
exists = false;
assert.equal((await report(request(data))).status, 404);
limited = true;
assert.equal((await report(request(data))).status, 429);
assert.equal((await moderate(request({}))).status, 401);

import test from 'node:test';
import assert from 'node:assert/strict';
import { logout } from '../src/lib/client-api';

test('logout preserves Origin under no-referrer and sends session cookies', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async (path: string, options: RequestInit) => {
      assert.equal(path, '/auth/logout');
      assert.equal(options.method, 'POST');
      assert.equal(options.mode, 'cors');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.referrerPolicy, 'no-referrer');
      assert.equal(options.redirect, 'follow');
      return new Response('<html>Login</html>', { status: 200 });
    },
  );
  await logout();
});

test('logout surfaces origin rejection instead of treating it as success', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Request origin is not allowed.' }, { status: 403 }),
  );
  await assert.rejects(logout(), /Request origin is not allowed/);
});

test('logout handles non-JSON and network failures', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('Unavailable', { status: 503 }),
  );
  await assert.rejects(logout(), /Unable to log out/);
  fetchMock.mock.mockImplementation(async () => {
    throw new Error('Network unavailable');
  });
  await assert.rejects(logout(), /Network unavailable/);
});

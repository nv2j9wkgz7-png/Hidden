import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerClient } from '@supabase/ssr';
import {
  authCallbackDestination,
  newPasswordInput,
} from '../src/lib/password-recovery';

test('Supabase PKCE cookies preserve recovery intent through a session exchange', async () => {
  const cookies = new Map<string, string>();
  let recoveryRedirect = '';
  let exchangeCount = 0;
  const options = {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items: { name: string; value: string }[]) => {
        for (const item of items) cookies.set(item.name, item.value);
      },
    },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const body = JSON.parse(String(init?.body));
        if (url.pathname.endsWith('/recover')) {
          assert.equal(body.email, 'creator@example.com');
          assert.equal(body.code_challenge_method, 's256');
          recoveryRedirect = url.searchParams.get('redirect_to')!;
          return Response.json({});
        }
        assert.equal(url.pathname, '/auth/v1/token');
        assert.equal(body.auth_code, 'test-code');
        assert.ok(body.code_verifier);
        exchangeCount++;
        return Response.json({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'test-user', email: 'creator@example.com' },
        });
      },
    },
  };
  const start = createServerClient(
    'https://auth.example.com',
    'test-key',
    options,
  );
  const sent = await start.auth.resetPasswordForEmail('creator@example.com', {
    redirectTo: 'https://sendhidn.com/auth/callback',
  });
  assert.equal(sent.error, null);
  const flowId = new URL(recoveryRedirect).searchParams.get('sb_flow_id');
  const callback = createServerClient(
    'https://auth.example.com',
    'test-key',
    options,
  );
  const { data, error } = await callback.auth.exchangeCodeForSession(
    'test-code',
    flowId ? { flowId } : undefined,
  );
  assert.equal(error, null);
  assert.ok(data.session);
  assert.equal('redirectType' in data && data.redirectType, 'recovery');
  assert.equal(exchangeCount, 1);
});

test('password changes require matching passwords within the allowed length', () => {
  for (const password of ['short', 'a'.repeat(129)]) {
    assert.equal(
      newPasswordInput.safeParse({ password, confirmation: password }).success,
      false,
    );
  }
  assert.equal(
    newPasswordInput.safeParse({
      password: 'a-long-password',
      confirmation: 'different-password',
    }).success,
    false,
  );
  assert.equal(
    newPasswordInput.safeParse({
      password: 'a-long-password',
      confirmation: 'a-long-password',
    }).success,
    true,
  );
});

test('recovery callbacks go to password reset only after a successful session exchange', () => {
  assert.equal(
    authCallbackDestination({
      failed: false,
      redirectType: 'recovery',
      next: 'new',
    }),
    '/reset-password',
  );
  assert.equal(
    authCallbackDestination({ failed: true, redirectType: 'recovery' }),
    '/login?error=confirmation',
  );
});

test('regular auth callbacks preserve first-drop signup and reject arbitrary redirect destinations', () => {
  assert.equal(authCallbackDestination({ failed: false, next: 'new' }), '/new');
  for (const next of [
    'https://example.com',
    '//example.com',
    '/reset-password',
    null,
  ]) {
    assert.equal(
      authCallbackDestination({ failed: false, next }),
      '/dashboard',
    );
  }
});

test('buyer login returns preserve library and exact save routes without open redirects', () => {
  for (const next of [
    'purchases',
    '/purchases',
    '/purchases/save/485307130f7e77fcd03bc436',
  ]) {
    assert.equal(
      authCallbackDestination({ failed: false, next }),
      next === 'purchases' ? '/purchases' : next,
    );
  }
  for (const next of [
    '/purchases//evil',
    '/purchases/save/../other',
    '/purchases?next=https://evil.example',
    '/purchases/save/485307130f7e77fcd03bc436?next=evil',
  ]) {
    assert.equal(
      authCallbackDestination({ failed: false, next }),
      '/dashboard',
    );
  }
});

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

import sharp from 'sharp';
const source = await sharp({
  create: { width: 1600, height: 1200, channels: 3, background: '#816099' },
})
  .png()
  .toBuffer();
let thumbnail: Buffer | undefined;
let downloads = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.hostname, 'database.example');
  if (url.pathname === '/auth/v1/user') return Response.json({ id: viewer });
  if (url.pathname.endsWith('/assets')) {
    assert.equal(url.searchParams.get('status'), 'eq.READY');
    return Response.json(
      ready
        ? {
            drop_id: dropId,
            storage_path: 'private/photo',
            mime_type: 'image/png',
          }
        : null,
    );
  }
  if (url.pathname.endsWith('/drops')) {
    assert.equal(url.searchParams.get('creator_id'), `eq.${viewer}`);
    return Response.json(
      viewer === owner
        ? { id: dropId, creator_id: owner, moderation_state: moderation }
        : null,
    );
  }
  if (url.pathname.includes('/storage/v1/object/sign/')) {
    signed++;
    return Response.json({
      signedURL: '/object/sign/originals/private/photo?token=test',
    });
  }
  if (url.pathname.includes('/storage/v1/object/')) {
    if (init?.method === 'POST') {
      writes++;
      assert.match(url.pathname, /originals\/private\/photo.thumbnail.jpg$/);
      thumbnail = Buffer.from(init.body as Uint8Array);
      return Response.json({ Key: 'saved' });
    }
    downloads++;
    if (url.pathname.endsWith('.thumbnail.jpg'))
      return thumbnail
        ? new Response(new Uint8Array(thumbnail))
        : Response.json({ message: 'not found' }, { status: 404 });
    return new Response(new Uint8Array(source));
  }
  throw Error(`Unexpected request ${url.pathname}`);
};
const { GET } = await import('../../src/app/api/creator/media/route');
const get = (view = '') =>
  GET(
    new Request(
      `https://hidn.example/api/creator/media?asset_id=${assetId}${view}`,
    ),
  );
assert.equal((await get()).status, 401);
login(crypto.randomUUID());
assert.equal((await get()).status, 404);
assert.equal(downloads, 0);
login(owner);
moderation = 'REMOVED';
assert.equal((await get()).status, 409);
assert.equal(downloads, 0);
moderation = 'ACTIVE';
ready = false;
assert.equal((await get()).status, 404);
ready = true;
const response = await get();
assert.equal(response.status, 200);
assert.equal(response.headers.get('content-type'), 'image/jpeg');
assert.equal(response.headers.get('cache-control'), 'private, no-store');
const bytes = Buffer.from(await response.arrayBuffer());
const metadata = await sharp(bytes).metadata();
assert.ok(metadata.width! <= 240 && metadata.height! <= 240);
assert.equal(metadata.exif, undefined);
assert.ok(bytes.length < source.length);
assert.equal(writes, 1);
const before = downloads;
assert.equal((await get()).status, 200);
assert.equal(downloads, before + 1);
assert.equal(writes, 1);
assert.equal(signed, 0);
assert.equal((await get('&view=original')).status, 307);
assert.equal(signed, 1);
console.log(
  JSON.stringify({
    originalBytes: source.length,
    thumbnailBytes: bytes.length,
  }),
);

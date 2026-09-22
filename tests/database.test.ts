import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { canDownload, newToken, hashToken } from '../src/lib/security';

test('Postgres primary flow and authorization boundaries', async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user_id',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  // Execute the exact shipping migration, with only auth/storage platform tables supplied above.
  await db.exec(
    await readFile('supabase/migrations/20260922192409_initial.sql', 'utf8'),
  );
  await db.exec(
    await readFile('supabase/migrations/20260922213000_stop_sales.sql', 'utf8'),
  );
  const creator = crypto.randomUUID(),
    other = crypto.randomUUID();
  await db.query('insert into auth.users values($1,$2),($3,$4)', [
    creator,
    'creator@example.com',
    other,
    'other@example.com',
  ]);
  const drop = (
    await db.query<{ id: string }>(
      "insert into public.drops(creator_id,title,price_cents) values($1,'Test images',1250) returning id",
      [creator],
    )
  ).rows[0].id;
  let asset = '';
  const purchaseId = crypto.randomUUID();
  await t.test(
    'creator cannot reserve uploads for someone else’s drop',
    async () => {
      await assert.rejects(
        db.query('select public.reserve_asset($1,$2,$3,$4,$5)', [
          drop,
          other,
          'x.jpg',
          'image/jpeg',
          100,
        ]),
        /not editable/,
      );
    },
  );
  await t.test('only the owner can edit a draft', async () => {
    await assert.rejects(
      db.query('select public.update_draft($1,$2,$3,$4)', [
        drop,
        other,
        'Changed',
        1250,
      ]),
      /not editable/,
    );
    await db.query('select public.update_draft($1,$2,$3,$4)', [
      drop,
      creator,
      'Updated title',
      1250,
    ]);
  });
  await t.test(
    'upload reservation, preview completion, and publishing',
    async () => {
      asset = (
        await db.query<{ id: string }>(
          'select id from public.reserve_asset($1,$2,$3,$4,$5)',
          [drop, creator, 'x.jpg', 'image/jpeg', 100],
        )
      ).rows[0].id;
      await assert.rejects(
        db.query('select public.publish_drop($1,$2)', [drop, creator]),
        /Finish uploading/,
      );
      await db.query(
        "update public.assets set status='READY',preview_path='safe.jpg' where id=$1",
        [asset],
      );
      await db.query('select public.publish_drop($1,$2)', [drop, creator]);
      await assert.rejects(
        db.query('select public.update_draft($1,$2,$3,$4)', [
          drop,
          creator,
          'Changed',
          100,
        ]),
        /not editable/,
      );
      await assert.rejects(
        db.query('select public.reserve_asset($1,$2,$3,$4,$5)', [
          drop,
          creator,
          'x.jpg',
          'image/jpeg',
          100,
        ]),
        /not editable/,
      );
      await assert.rejects(
        db.query('select public.remove_draft_asset($1,$2,$3)', [
          drop,
          creator,
          asset,
        ]),
        /not editable/,
      );
    },
  );
  await t.test('pending purchase has no original access', async () => {
    await db.query(
      "insert into public.purchases(id,drop_id,payment_provider,amount_cents,access_token) values($1,$2,'stripe',1250,$3)",
      [purchaseId, drop, hashToken(newToken())],
    );
    const p = (
      await db.query<{ status: string; drop_id: string }>(
        'select status,drop_id from public.purchases where id=$1',
        [purchaseId],
      )
    ).rows[0];
    assert.equal(canDownload(p, drop), false);
  });
  async function apply(
    eventId: string,
    kind = 'paid',
    amount = 1250,
    provider = 'stripe',
    transaction = 'cs_test',
    currency = 'usd',
  ) {
    return db.query<{ applied: boolean }>(
      'select public.apply_payment_event($1,$2,$3,$4,$5,$6,$7,$8) as applied',
      [
        provider,
        eventId,
        purchaseId,
        transaction,
        amount,
        currency,
        kind,
        'buyer@example.com',
      ],
    );
  }
  await t.test(
    'price, currency, and provider mismatch fail without recording an event',
    async () => {
      await assert.rejects(apply('evt_wrong', 'paid', 1), /mismatch/);
      await assert.rejects(
        apply('evt_wrong', 'paid', 1250, 'another'),
        /mismatch/,
      );
      await assert.rejects(
        apply('evt_wrong', 'paid', 1250, 'stripe', 'cs_test', 'eur'),
        /mismatch/,
      );
      assert.equal(
        (await db.query('select * from public.payment_events')).rows.length,
        0,
      );
    },
  );
  await t.test(
    'verified payment unlocks only its own drop; repeated events are idempotent',
    async () => {
      await apply('evt_paid');
      const repeated = await apply('evt_paid');
      assert.equal(repeated.rows[0].applied, false);
      const p = (
        await db.query<{ status: string; drop_id: string }>(
          'select status,drop_id from public.purchases where id=$1',
          [purchaseId],
        )
      ).rows[0];
      assert.equal(canDownload(p, drop), true);
      assert.equal(canDownload(p, crypto.randomUUID()), false);
      await assert.rejects(
        apply('evt_bad_id', 'paid', 1250, 'stripe', 'cs_different'),
        /mismatch/,
      );
      assert.equal(
        (await db.query('select * from public.payment_events')).rows.length,
        1,
      );
    },
  );
  await t.test(
    'refund revokes access and late payment events cannot restore it',
    async () => {
      await apply('evt_refund', 'refunded');
      await apply('evt_late_paid');
      const p = (
        await db.query<{ status: string; drop_id: string }>(
          'select status,drop_id from public.purchases where id=$1',
          [purchaseId],
        )
      ).rows[0];
      assert.equal(p.status, 'REFUNDED');
      assert.equal(canDownload(p, drop), false);
    },
  );
  await t.test(
    'gross revenue and sales count each captured payment once',
    async () => {
      const row = (
        await db.query<{ sales: number; gross_cents: number }>(
          'select * from public.creator_stats($1)',
          [creator],
        )
      ).rows[0];
      assert.equal(Number(row.sales), 1);
      assert.equal(Number(row.gross_cents), 1250);
    },
  );
  await t.test(
    'anonymous clients cannot query protected tables or invoke privileged functions',
    async () => {
      await db.exec('set role anon');
      for (const table of [
        'users',
        'drops',
        'assets',
        'purchases',
        'payment_events',
        'rate_limits',
      ])
        await assert.rejects(
          db.query(`select * from public.${table}`),
          /permission denied/,
        );
      await assert.rejects(
        db.query('select public.publish_drop($1,$2)', [drop, creator]),
        /permission denied/,
      );
      await db.exec('reset role');
    },
  );
  await t.test(
    'authenticated creators see only their own rows and cannot mutate status',
    async () => {
      await db.query("select set_config('test.user_id',$1,false)", [other]);
      await db.exec('set role authenticated');
      assert.equal(
        (await db.query('select * from public.drops')).rows.length,
        0,
      );
      assert.equal(
        (await db.query('select * from public.assets')).rows.length,
        0,
      );
      await assert.rejects(
        db.query("update public.drops set status='PUBLISHED'"),
        /permission denied/,
      );
      await assert.rejects(
        db.query('select * from public.purchases'),
        /permission denied/,
      );
      await db.exec('reset role');
      await db.query("select set_config('test.user_id',$1,false)", [creator]);
      await db.exec('set role authenticated');
      assert.equal(
        (await db.query('select * from public.drops')).rows.length,
        1,
      );
      await db.exec('reset role');
    },
  );
  await t.test(
    'original bucket is private and previews are public',
    async () => {
      const buckets = (
        await db.query<{ id: string; public: boolean }>(
          'select id,public from storage.buckets',
        )
      ).rows;
      assert.equal(buckets.find((b) => b.id === 'originals')?.public, false);
      assert.equal(buckets.find((b) => b.id === 'previews')?.public, true);
    },
  );
  await t.test('durable rate limiter enforces its budget', async () => {
    for (let i = 0; i < 3; i++)
      assert.equal(
        (
          await db.query<{ allowed: boolean }>(
            'select public.consume_rate_limit($1,3,3600) as allowed',
            ['test'],
          )
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          'select public.consume_rate_limit($1,3,3600) as allowed',
          ['test'],
        )
      ).rows[0].allowed,
      false,
    );
  });
  await t.test(
    'stopping sales blocks new reservations and preserves paid access',
    async () => {
      const id = crypto.randomUUID();
      const paidId = crypto.randomUUID();
      await db.query(
        "insert into public.drops(id,creator_id,title,price_cents,status) values($1,$2,'Closing test',100,'PUBLISHED')",
        [id, creator],
      );
      await db.query(
        "insert into public.purchases(id,drop_id,payment_provider,amount_cents,status,access_token) values($1,$2,'stripe',100,'PAID',$3)",
        [paidId, id, hashToken(newToken())],
      );
      for (const state of ['CLOSING', 'CLOSED']) {
        await db.query('update public.drops set status=$1 where id=$2', [
          state,
          id,
        ]);
        await assert.rejects(
          db.query(
            "insert into public.purchases(drop_id,payment_provider,amount_cents,access_token) values($1,'stripe',100,$2)",
            [id, hashToken(newToken())],
          ),
          /closed to new purchases/,
        );
        const paid = (
          await db.query<{ status: string; drop_id: string }>(
            'select status,drop_id from public.purchases where id=$1',
            [paidId],
          )
        ).rows[0];
        assert.equal(canDownload(paid, id), true);
      }
    },
  );
  await db.close();
});

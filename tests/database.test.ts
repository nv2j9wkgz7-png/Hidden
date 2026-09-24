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
  await db.exec(
    await readFile(
      'supabase/migrations/20260923170000_drop_description.sql',
      'utf8',
    ),
  );
  await db.exec(
    await readFile(
      'supabase/migrations/20260923180000_edit_drop_details.sql',
      'utf8',
    ),
  );
  const creator = crypto.randomUUID(),
    other = crypto.randomUUID();
  await db.exec(
    await readFile(
      'supabase/migrations/20260922230000_purchase_email.sql',
      'utf8',
    ),
  );
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
  await t.test('draft descriptions persist and require ownership', async () => {
    await assert.rejects(
      db.query('select public.update_draft($1,$2,$3,$4,$5)', [
        drop,
        other,
        'Test images',
        1250,
        'Unauthorized',
      ]),
    );
    await db.query('select public.update_draft($1,$2,$3,$4,$5)', [
      drop,
      creator,
      'Test images',
      1250,
      'Four coastal images.\nFull-resolution files.',
    ]);
    const saved = await db.query<{ description: string }>(
      'select description from public.drops where id=$1',
      [drop],
    );
    assert.equal(
      saved.rows[0].description,
      'Four coastal images.\nFull-resolution files.',
    );
    await assert.rejects(
      db.query('select public.update_draft($1,$2,$3,$4,$5)', [
        drop,
        creator,
        'Test images',
        1250,
        'a'.repeat(2001),
      ]),
    );
  });
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
  await t.test(
    'published details require ownership and allow a final price edit',
    async () => {
      await assert.rejects(
        db.query('select public.update_drop_details($1,$2,$3,$4,$5)', [
          drop,
          other,
          'Changed',
          1500,
          'Description',
        ]),
      );
      await db.query('select public.update_drop_details($1,$2,$3,$4,$5)', [
        drop,
        creator,
        'Test images',
        1500,
        'Final description',
      ]);
      await db.query('select public.update_drop_details($1,$2,$3,$4,$5)', [
        drop,
        creator,
        'Test images',
        1250,
        'Final description',
      ]);
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
  await t.test(
    'checkout locks price but not title or description',
    async () => {
      await assert.rejects(
        db.query('select public.update_drop_details($1,$2,$3,$4,$5)', [
          drop,
          creator,
          'Test images',
          1500,
          'New description',
        ]),
        /Price is locked/,
      );
      await db.query('select public.update_drop_details($1,$2,$3,$4,$5)', [
        drop,
        creator,
        'Test images',
        1250,
        'New description',
      ]);
    },
  );
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
    'email recovery preserves checkout access and still enforces payment status and drop ownership',
    async () => {
      const emailToken = newToken();
      const original = (
        await db.query<{ access_token: string }>(
          'select access_token from public.purchases where id=$1',
          [purchaseId],
        )
      ).rows[0].access_token;
      await db.query(
        'update public.purchases set email_access_token=$1 where id=$2',
        [hashToken(emailToken), purchaseId],
      );
      const lookup = async (dropId: string, hash: string) =>
        (
          await db.query<{ status: string; drop_id: string }>(
            'select status,drop_id from public.purchases where drop_id=$1 and (access_token=$2 or email_access_token=$2)',
            [dropId, hash],
          )
        ).rows[0] || null;
      assert.ok(await lookup(drop, original));
      assert.ok(await lookup(drop, hashToken(emailToken)));
      assert.equal(
        canDownload(await lookup(drop, hashToken(emailToken)), drop),
        false,
      ); // Refunded above.
      assert.equal(
        await lookup(crypto.randomUUID(), hashToken(emailToken)),
        null,
      );
      assert.equal(await lookup(drop, hashToken(newToken())), null);
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
  await t.test(
    'payout identities are server-only and isolate sandbox from live',
    async () => {
      await db.exec(
        await readFile(
          'supabase/migrations/20260923200000_creator_payouts.sql',
          'utf8',
        ),
      );
      await db.query(
        "insert into public.creator_payout_accounts(creator_id,livemode,stripe_account_id) values($1,false,'acct_test'),($1,true,'acct_live')",
        [creator],
      );
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(
          db.query('select * from public.creator_payout_accounts'),
          /permission denied/,
        );
        await assert.rejects(
          db.query(
            "update public.creator_payout_accounts set stripe_account_id='acct_attacker'",
          ),
          /permission denied/,
        );
        await db.exec('reset role');
      }
      await assert.rejects(
        db.query(
          "insert into public.creator_payout_accounts(creator_id,livemode,stripe_account_id) values($1,false,'acct_duplicate')",
          [creator],
        ),
        /duplicate key/,
      );
      const identities = await db.query(
        'select * from public.creator_payout_accounts where creator_id=$1',
        [creator],
      );
      assert.equal(identities.rows.length, 2);
      await db.exec(
        await readFile(
          'supabase/migrations/20260923210000_direct_connect_payments.sql',
          'utf8',
        ),
      );
    },
  );
  await t.test(
    'connected payments reject the wrong seller account and accept the correct scope',
    async () => {
      const connectedDrop = crypto.randomUUID(),
        purchase = crypto.randomUUID();
      await db.query(
        "insert into public.drops(id,creator_id,title,price_cents,status) values($1,$2,'Connect test',2500,'PUBLISHED')",
        [connectedDrop, creator],
      );
      await db.query(
        "insert into public.purchases(id,drop_id,payment_provider,amount_cents,access_token,stripe_account_id,platform_fee_cents) values($1,$2,'stripe',2500,$3,'acct_seller',125)",
        [purchase, connectedDrop, hashToken(newToken())],
      );
      for (const account of [null, 'acct_other']) {
        await assert.rejects(
          db.query(
            "select public.apply_payment_event('stripe','evt_connect',$1,'cs_connect',2500,'usd','paid',null,$2)",
            [purchase, account],
          ),
          /Payment account mismatch/,
        );
      }
      await db.query(
        "select public.apply_payment_event('stripe','evt_connect',$1,'cs_connect',2500,'usd','paid',null,'acct_seller')",
        [purchase],
      );
      assert.equal(
        (
          await db.query<{ status: string }>(
            'select status from public.purchases where id=$1',
            [purchase],
          )
        ).rows[0].status,
        'PAID',
      );
      await assert.rejects(
        db.query(
          'update public.purchases set platform_fee_cents=2501 where id=$1',
          [purchase],
        ),
        /purchase_platform_fee_bounds/,
      );
    },
  );
  await t.test(
    'media migration preserves security and saves complete draft order atomically',
    async () => {
      await db.exec(
        await readFile(
          'supabase/migrations/20260924010000_media_and_order.sql',
          'utf8',
        ),
      );
      const mediaDrop = crypto.randomUUID(),
        foreignDrop = crypto.randomUUID();
      await db.query(
        "insert into public.drops(id,creator_id,title,price_cents) values($1,$2,'Media',100),($3,$4,'Other',100)",
        [mediaDrop, creator, foreignDrop, other],
      );
      const reserve = async (
        id: string,
        owner: string,
        size = 1024,
        mime = 'video/mp4',
      ) =>
        (
          await db.query<{ id: string }>(
            'select * from public.reserve_asset($1,$2,$3,$4,$5)',
            [id, owner, 'clip.mp4', mime, size],
          )
        ).rows[0].id;
      const a = await reserve(mediaDrop, creator),
        b = await reserve(mediaDrop, creator),
        c = await reserve(foreignDrop, other);
      const order = (ids: string[], owner = creator) =>
        db.query('select public.reorder_draft_assets($1,$2,$3)', [
          mediaDrop,
          owner,
          ids,
        ]);
      await order([b, a]);
      assert.deepEqual(
        (
          await db.query<{ id: string }>(
            'select id from public.assets where drop_id=$1 order by sort_order',
            [mediaDrop],
          )
        ).rows.map((r) => r.id),
        [b, a],
      );
      await assert.rejects(order([a, a]));
      await assert.rejects(order([a]));
      await assert.rejects(order([a, c]));
      await assert.rejects(order([a, b], other));
      await assert.rejects(reserve(mediaDrop, creator, 52428801));
      await assert.rejects(reserve(mediaDrop, creator, 10485761, 'image/jpeg'));
      for (let i = 0; i < 3; i++) await reserve(mediaDrop, creator, 52428800);
      await assert.rejects(
        reserve(mediaDrop, creator, 52428800),
        /Maximum 200 MB/,
      );
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(order([a, b]), /permission denied/);
        await db.exec('reset role');
      }
      await db.query("update public.drops set status='PUBLISHED' where id=$1", [
        mediaDrop,
      ]);
      await assert.rejects(order([a, b]), /not editable/);
      assert.equal(
        (
          await db.query<{ public: boolean }>(
            "select public from storage.buckets where id='originals'",
          )
        ).rows[0].public,
        false,
      );
    },
  );
  await t.test(
    'sale notices are atomic, deduplicated and isolated by creator',
    async () => {
      await db.exec(
        await readFile(
          'supabase/migrations/20260924020000_sale_notifications.sql',
          'utf8',
        ),
      );
      const id = crypto.randomUUID(),
        sale = crypto.randomUUID();
      await db.query(
        "insert into public.drops(id,creator_id,title,price_cents,status) values($1,$2,'Notification test',100,'PUBLISHED')",
        [id, creator],
      );
      await db.query(
        "insert into public.purchases(id,drop_id,payment_provider,amount_cents,access_token) values($1,$2,'stripe',100,$3)",
        [sale, id, hashToken(newToken())],
      );
      assert.equal(
        (await db.query('select * from public.sale_notifications')).rows.length,
        0,
      );
      await db.query("update public.purchases set status='PAID' where id=$1", [
        sale,
      ]);
      await db.query("update public.purchases set status='PAID' where id=$1", [
        sale,
      ]);
      assert.equal(
        (await db.query('select * from public.sale_notifications')).rows.length,
        1,
      );
      await db.exec('set role authenticated');
      await db.query("select set_config('test.user_id',$1,false)", [other]);
      assert.equal(
        (await db.query('select * from public.sale_notifications')).rows.length,
        0,
      );
      await db.query("select set_config('test.user_id',$1,false)", [creator]);
      assert.equal(
        (await db.query('select * from public.sale_notifications')).rows.length,
        1,
      );
      await assert.rejects(
        db.query('update public.sale_notifications set read_at=now()'),
      );
      await db.exec('reset role');
      await db.query(
        "update public.purchases set status='REFUNDED' where id=$1",
        [sale],
      );
      assert.equal(
        (await db.query('select * from public.sale_notifications')).rows.length,
        1,
      );
      await db.exec('set role anon');
      await assert.rejects(db.query('select * from public.sale_notifications'));
      await db.exec('reset role');
    },
  );
  await t.test(
    'saved purchases have private one-time ownership without renewing guest access',
    async () => {
      await db.exec(
        await readFile(
          'supabase/migrations/20260924040000_saved_purchases.sql',
          'utf8',
        ),
      );
      const purchase = crypto.randomUUID();
      await db.query(
        "insert into public.purchases(id,drop_id,payment_provider,amount_cents,access_token,status,paid_at) values($1,$2,'stripe',100,$3,'PAID',now())",
        [purchase, drop, hashToken(newToken())],
      );
      const claim = (buyer: string) =>
        db.query(
          "update public.purchases set buyer_id=$1,saved_at=now() where id=$2 and buyer_id is null and status='PAID' and paid_at > now()-interval '72 hours' returning id",
          [buyer, purchase],
        );
      const before = (
        await db.query('select paid_at from public.purchases where id=$1', [
          purchase,
        ])
      ).rows;
      assert.equal((await claim(other)).rows.length, 1);
      assert.equal((await claim(creator)).rows.length, 0);
      assert.deepEqual(
        (
          await db.query('select paid_at from public.purchases where id=$1', [
            purchase,
          ])
        ).rows,
        before,
      );
      assert.equal(
        (
          await db.query(
            'select id from public.purchases where id=$1 and buyer_id=$2',
            [purchase, creator],
          )
        ).rows.length,
        0,
      );
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query('select buyer_id from public.purchases'));
        await assert.rejects(
          db.query('update public.purchases set buyer_id=$1', [creator]),
        );
        await db.exec('reset role');
      }
      await db.query(
        "update public.purchases set buyer_id=null,paid_at=now()-interval '73 hours' where id=$1",
        [purchase],
      );
      assert.equal((await claim(other)).rows.length, 0);
      await db.query(
        "update public.purchases set status='REFUNDED',paid_at=now() where id=$1",
        [purchase],
      );
      assert.equal((await claim(other)).rows.length, 0);
    },
  );
  await db.close();
});

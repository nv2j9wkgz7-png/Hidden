-- Keep sandbox and live identities separate. Stripe handles identity/bank details.
create table public.creator_payout_accounts (
 creator_id uuid not null references public.users(id) on delete cascade,
 livemode boolean not null,
 stripe_account_id text not null unique check(stripe_account_id like 'acct_%'),
 created_at timestamptz not null default now(),
 primary key (creator_id, livemode)
);
alter table public.creator_payout_accounts enable row level security;
revoke all on public.creator_payout_accounts from anon, authenticated;
grant all on public.creator_payout_accounts to service_role;

-- Snapshot the routing and fee on the purchase, independent of future pricing changes.
alter table public.purchases
 add column destination_account_id text,
 add column platform_fee_cents integer,
 add constraint purchase_platform_fee_bounds check(platform_fee_cents between 0 and amount_cents);

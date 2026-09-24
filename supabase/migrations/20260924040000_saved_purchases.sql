begin;
-- Account ownership is optional. Guest tokens keep their 72-hour deadline.
alter table public.purchases
 add column buyer_id uuid references public.users(id) on delete set null,
 add column saved_at timestamptz;
create index purchases_buyer on public.purchases(buyer_id,paid_at desc)
 where buyer_id is not null;
-- Purchases remain service-role-only. Never expose payment or bearer-token rows.
commit;

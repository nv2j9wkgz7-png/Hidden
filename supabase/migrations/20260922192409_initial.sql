-- Run once in Supabase SQL editor, or with `supabase db push`.
-- Supabase may already have pgcrypto installed in the extensions schema.
set search_path = public, extensions;
create extension if not exists pgcrypto;
create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 created_at timestamptz not null default now()
);
create function public.sync_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.users(id,email) values(new.id,coalesce(new.email,'')) on conflict(id) do update set email=excluded.email;
 return new;
end; $$;
create trigger sync_auth_user after insert or update of email on auth.users for each row execute function public.sync_user();
insert into public.users(id,email) select id,coalesce(email,'') from auth.users on conflict do nothing;
create table public.drops (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.users(id),
 title text not null check(length(title) between 1 and 100),
 slug text unique not null default encode(gen_random_bytes(12),'hex'),
 price_cents integer not null check(price_cents between 50 and 100000),
 currency text not null default 'usd' check(currency='usd'),
 status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED')),
 created_at timestamptz not null default now()
);
create index drops_creator on public.drops(creator_id);
create table public.assets (
 id uuid primary key default gen_random_uuid(),
 drop_id uuid not null references public.drops(id) on delete cascade,
 storage_path text unique not null,
 preview_path text,
 original_filename text not null,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 sort_order integer not null check(sort_order between 0 and 19),
 status text not null default 'UPLOADING' check(status in ('UPLOADING','READY')),
 unique(drop_id,sort_order),
 check(status <> 'READY' or preview_path is not null)
);
create table public.purchases (
 id uuid primary key default gen_random_uuid(),
 drop_id uuid not null references public.drops(id),
 payment_provider text not null,
 payment_provider_transaction_id text,
 amount_cents integer not null check(amount_cents > 0),
 currency text not null default 'usd' check(currency='usd'),
 status text not null default 'PENDING' check(status in ('PENDING','PAID','REFUNDED')),
 customer_email text,
 -- SHA-256 of a 256-bit bearer token. Never store the raw token.
 access_token text unique not null,
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 unique(payment_provider,payment_provider_transaction_id)
);
create index purchases_drop on public.purchases(drop_id);
create table public.payment_events (
 provider text not null,
 event_id text not null,
 purchase_id uuid not null references public.purchases(id),
 created_at timestamptz not null default now(),
 primary key(provider,event_id)
);
create table public.rate_limits (key text primary key, window_start timestamptz not null, hits integer not null);
alter table public.users enable row level security;
alter table public.drops enable row level security;
alter table public.assets enable row level security;
alter table public.purchases enable row level security;
alter table public.payment_events enable row level security;
alter table public.rate_limits enable row level security;
-- Public pages are served through server-only queries with explicit projections.
-- Browser clients cannot read purchases/tokens/storage paths or mutate product rows.
revoke all on public.users,public.drops,public.assets,public.purchases,public.payment_events,public.rate_limits from anon,authenticated;
grant select on public.users,public.drops,public.assets to authenticated;
create policy own_user on public.users for select to authenticated using(id=(select auth.uid()));
create policy own_drops on public.drops for select to authenticated using(creator_id=(select auth.uid()));
create policy own_assets on public.assets for select to authenticated using(exists(select 1 from public.drops d where d.id=drop_id and d.creator_id=(select auth.uid())));
grant all on public.users,public.drops,public.assets,public.purchases,public.payment_events,public.rate_limits to service_role;

-- Serialize upload reservations and publishing on the drop row.
create function public.reserve_asset(p_drop uuid,p_creator uuid,p_filename text,p_mime text,p_size integer) returns public.assets
language plpgsql security definer set search_path='' as $$
declare d public.drops; a public.assets; n integer; asset_id uuid := gen_random_uuid();
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status <> 'DRAFT' then raise exception 'Drop is not editable'; end if;
 select min(slot) into n from generate_series(0,19) slot where not exists(select 1 from public.assets where drop_id=p_drop and sort_order=slot);
 if n is null then raise exception 'Maximum 20 images'; end if;
 insert into public.assets(id,drop_id,storage_path,original_filename,mime_type,size_bytes,sort_order)
 values(asset_id,p_drop,p_creator::text||'/'||p_drop::text||'/'||asset_id::text,p_filename,p_mime,p_size,n) returning * into a;
 return a;
end; $$;
create function public.publish_drop(p_drop uuid,p_creator uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.drops;
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null then raise exception 'Drop not found'; end if;
 if not exists(select 1 from public.assets where drop_id=p_drop and status='READY') or exists(select 1 from public.assets where drop_id=p_drop and status<>'READY') then raise exception 'Finish uploading every image before publishing'; end if;
 update public.drops set status='PUBLISHED' where id=p_drop;
end; $$;
-- Recording the event and changing access happen in the same transaction.
create function public.apply_payment_event(p_provider text,p_event_id text,p_purchase uuid,p_transaction text,p_amount integer,p_currency text,p_kind text,p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare purchase public.purchases;
begin
 if p_kind not in ('paid','refunded') then raise exception 'Invalid payment event'; end if;
 select * into purchase from public.purchases where id=p_purchase for update;
 if purchase.id is null then raise exception 'Purchase not found'; end if;
 if purchase.payment_provider<>p_provider or purchase.amount_cents<>p_amount or purchase.currency<>p_currency or
 (purchase.payment_provider_transaction_id is not null and purchase.payment_provider_transaction_id<>p_transaction) then
 raise exception 'Payment details mismatch'; end if;
 insert into public.payment_events(provider,event_id,purchase_id) values(p_provider,p_event_id,p_purchase) on conflict do nothing;
 if not found then return false; end if;
 update public.purchases set
 payment_provider_transaction_id=p_transaction,
 customer_email=coalesce(p_email,customer_email),
 status=case when p_kind='refunded' then 'REFUNDED' when status='REFUNDED' then 'REFUNDED' else 'PAID' end,
 paid_at=case when p_kind='paid' then coalesce(paid_at,now()) else paid_at end
 where id=p_purchase;
 return true;
end; $$;
create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare count_hits integer;
begin
 insert into public.rate_limits(key,window_start,hits) values(p_key,now(),1)
 on conflict(key) do update set
 hits=case when public.rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else public.rate_limits.hits+1 end,
 window_start=case when public.rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else public.rate_limits.window_start end
 returning hits into count_hits;
 return count_hits<=p_limit;
end; $$;
revoke all on function public.sync_user() from public,anon,authenticated;
revoke all on function public.reserve_asset(uuid,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.publish_drop(uuid,uuid) from public,anon,authenticated;
revoke all on function public.apply_payment_event(text,text,uuid,text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_asset(uuid,uuid,text,text,integer), public.publish_drop(uuid,uuid), public.apply_payment_event(text,text,uuid,text,integer,text,text,text), public.consume_rate_limit(text,integer,integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('originals','originals',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('previews','previews',true,1048576,array['image/jpeg']);
-- Deliberately NO storage.objects policies: original reads/writes and preview writes
-- require the server's service role or a narrowly scoped signed URL.
create function public.creator_stats(p_creator uuid) returns table(drop_id uuid,sales bigint,gross_cents bigint)
language sql security definer set search_path='' as $$
 select d.id,count(p.id) filter(where p.paid_at is not null),coalesce(sum(p.amount_cents) filter(where p.paid_at is not null),0)
 from public.drops d left join public.purchases p on p.drop_id=d.id where d.creator_id=p_creator group by d.id;
$$;
revoke all on function public.creator_stats(uuid) from public,anon,authenticated;
grant execute on function public.creator_stats(uuid) to service_role;
create function public.remove_draft_asset(p_drop uuid,p_creator uuid,p_asset uuid) returns public.assets
language plpgsql security definer set search_path='' as $$
declare d public.drops; a public.assets;
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status<>'DRAFT' then raise exception 'Drop is not editable'; end if;
 delete from public.assets where id=p_asset and drop_id=p_drop returning * into a;
 return a;
end; $$;
revoke all on function public.remove_draft_asset(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.remove_draft_asset(uuid,uuid,uuid) to service_role;
create function public.update_draft(p_drop uuid,p_creator uuid,p_title text,p_price integer) returns void
language plpgsql security definer set search_path='' as $$
declare d public.drops;
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status<>'DRAFT' then raise exception 'Drop is not editable'; end if;
 update public.drops set title=p_title,price_cents=p_price where id=p_drop;
end; $$;
revoke all on function public.update_draft(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.update_draft(uuid,uuid,text,integer) to service_role;

reset search_path;

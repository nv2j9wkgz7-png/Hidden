begin;
alter table public.purchases add column checkout_started_at timestamptz;
-- Existing provider sessions are real checkout starts; failed reservations are not.
update public.purchases set checkout_started_at=created_at where payment_provider_transaction_id is not null;
create index purchases_drop_checkout on public.purchases(drop_id,checkout_started_at);
create table public.drop_analytics_daily (
 drop_id uuid not null references public.drops(id) on delete cascade,
 day date not null, views bigint not null default 0 check(views>=0), primary key(drop_id,day)
);
-- Random per-drop, per-tab identifiers only; never email, account ID or IP.
create table public.drop_view_keys (
 drop_id uuid not null references public.drops(id) on delete cascade,
 day date not null, session_hash text not null check(session_hash ~ '^[a-f0-9]{64}$'),
 primary key(drop_id,day,session_hash)
);
create index drop_view_keys_expiry on public.drop_view_keys(day);
alter table public.drop_analytics_daily enable row level security;
alter table public.drop_view_keys enable row level security;
revoke all on public.drop_analytics_daily,public.drop_view_keys from public,anon,authenticated;
grant all on public.drop_analytics_daily,public.drop_view_keys to service_role;
create function public.record_drop_view(p_drop uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
declare today date := (now() at time zone 'UTC')::date; inserted boolean;
begin
 if p_session is null or p_session !~ '^[a-f0-9]{64}$' then raise exception 'Invalid session'; end if;
 if not exists(select 1 from public.drops where id=p_drop and status in ('PUBLISHED','CLOSING','CLOSED') and moderation_state<>'REMOVED') then return; end if;
 -- Bounded cleanup of short-lived deduplication keys. Aggregate counts remain.
 delete from public.drop_view_keys where (drop_id,day,session_hash) in
  (select drop_id,day,session_hash from public.drop_view_keys where day<today-1 limit 1000);
 insert into public.drop_view_keys(drop_id,day,session_hash) values(p_drop,today,p_session)
 on conflict do nothing returning true into inserted;
 if inserted then
  insert into public.drop_analytics_daily(drop_id,day,views) values(p_drop,today,1)
  on conflict(drop_id,day) do update set views=public.drop_analytics_daily.views+1;
 end if;
end; $$;
create function public.drop_analytics(p_creator uuid,p_drop uuid,p_days integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare first_day date; result jsonb;
begin
 if p_days is null or p_days not in (7,30,90) then raise exception 'Invalid period'; end if;
 if not exists(select 1 from public.drops where id=p_drop and creator_id=p_creator) then raise exception 'Drop unavailable'; end if;
 first_day := (now() at time zone 'UTC')::date-(p_days-1);
 with days as (
  select first_day+i as day from generate_series(0,p_days-1) i
 ), checkouts as (
  select (checkout_started_at at time zone 'UTC')::date as day,
   count(*) as checkouts,
   count(*) filter(where status='PAID') as purchases,
   coalesce(sum(amount_cents) filter(where status='PAID'),0) as gross_cents
  from public.purchases where drop_id=p_drop
   and checkout_started_at >= (first_day::timestamp at time zone 'UTC')
   and checkout_started_at < (((now() at time zone 'UTC')::date+1)::timestamp at time zone 'UTC')
  group by 1
 ), daily as (
  select days.day,coalesce(v.views,0) as views,coalesce(c.checkouts,0) as checkouts,
   coalesce(c.purchases,0) as purchases,coalesce(c.gross_cents,0) as gross_cents
  from days left join public.drop_analytics_daily v on v.drop_id=p_drop and v.day=days.day
   left join checkouts c on c.day=days.day
 ) select jsonb_build_object('views',sum(views),'checkouts',sum(checkouts),
  'purchases',sum(purchases),'gross_cents',sum(gross_cents),
  'daily',jsonb_agg(to_jsonb(daily) order by day)) into result from daily;
 return result;
end; $$;
revoke all on function public.record_drop_view(uuid,text),public.drop_analytics(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.record_drop_view(uuid,text),public.drop_analytics(uuid,uuid,integer) to service_role;
commit;

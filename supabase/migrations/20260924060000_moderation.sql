begin;
alter table public.users add column creator_suspended boolean not null default false;
alter table public.drops add column moderation_state text not null default 'ACTIVE' check (moderation_state in ('ACTIVE','PAUSED','REMOVED'));
create table public.moderation_admins (user_id uuid primary key references public.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.content_reports (
 id uuid primary key default gen_random_uuid(), drop_id uuid not null references public.drops(id),
 category text not null check(category in ('UNDERAGE','NONCONSENSUAL','COPYRIGHT','SCAM','OTHER')),
 details text not null check(length(details) between 10 and 2000),
 contact_email text check(length(contact_email)<=254), reporter_key text not null,
 priority integer not null check(priority between 0 and 2),
 status text not null default 'OPEN' check(status in ('OPEN','REVIEWING','RESOLVED','DISMISSED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(drop_id,reporter_key)
);
create index content_reports_queue on public.content_reports(status,priority,created_at);
create table public.moderation_audit (
 id uuid primary key, report_id uuid not null references public.content_reports(id),
 actor_id uuid not null references public.users(id), action text not null, note text not null,
 created_at timestamptz not null default now()
);
-- External cleanup can be retried after a provider outage; blocking is committed first.
create table public.moderation_cleanup (
 drop_id uuid primary key references public.drops(id), pending boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.moderation_admins enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_audit enable row level security;
alter table public.moderation_cleanup enable row level security;
revoke all on public.moderation_admins,public.content_reports,public.moderation_audit,public.moderation_cleanup from public,anon,authenticated;
grant all on public.moderation_admins,public.content_reports,public.moderation_audit,public.moderation_cleanup to service_role;

create or replace function public.require_open_drop() returns trigger language plpgsql set search_path='' as $$
declare d public.drops;
begin
 select * into d from public.drops where id=new.drop_id for update;
 if d.status is distinct from 'PUBLISHED' or d.moderation_state <> 'ACTIVE' or
   exists(select 1 from public.users where id=d.creator_id and creator_suspended) then
  raise exception 'This drop is closed to new purchases';
 end if;
 return new;
end; $$;
-- Server endpoints and database guards both block suspended creator writes.
create function public.guard_creator_drop() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' or (new.status='PUBLISHED' and old.status is distinct from 'PUBLISHED') then
  if new.moderation_state <> 'ACTIVE' or exists(select 1 from public.users where id=new.creator_id and creator_suspended) then
   raise exception 'Creator publishing is restricted';
  end if;
 end if;
 return new;
end; $$;
create trigger creator_drop_guard before insert or update of status on public.drops for each row execute function public.guard_creator_drop();
create function public.guard_creator_asset() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.drops d join public.users u on u.id=d.creator_id where d.id=new.drop_id and (d.moderation_state <> 'ACTIVE' or u.creator_suspended)) then
  raise exception 'Uploads are restricted for this drop';
 end if;
 return new;
end; $$;
create trigger creator_asset_guard before insert or update on public.assets for each row execute function public.guard_creator_asset();
revoke all on function public.guard_creator_drop(),public.guard_creator_asset() from public,anon,authenticated;

create function public.moderate_report(p_actor uuid,p_report uuid,p_action text,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.content_reports; d public.drops; previous public.moderation_audit;
begin
 if not exists(select 1 from public.moderation_admins where user_id=p_actor) then raise exception 'Admin access required'; end if;
 if length(btrim(p_note)) not between 5 and 1000 then raise exception 'A review note is required'; end if;
 if p_action not in ('REVIEW','RESOLVE','DISMISS','PAUSE','REMOVE','RESUME','SUSPEND','UNSUSPEND','RETRY_CLEANUP') then raise exception 'Invalid moderation action'; end if;
 select * into r from public.content_reports where id=p_report for update;
 if not found then raise exception 'Report unavailable'; end if;
 select * into previous from public.moderation_audit where id=p_request;
 if found then
  if previous.actor_id<>p_actor or previous.report_id<>p_report or previous.action<>p_action then raise exception 'Request already used'; end if;
  return r.drop_id;
 end if;
 select * into d from public.drops where id=r.drop_id for update;
 if p_action='PAUSE' then
  if d.moderation_state='REMOVED' then raise exception 'Removed content cannot be resumed'; end if;
  update public.drops set moderation_state='PAUSED' where id=d.id;
 elsif p_action='REMOVE' then
  update public.drops set moderation_state='REMOVED' where id=d.id;
 elsif p_action='RESUME' then
  if d.moderation_state<>'PAUSED' then raise exception 'Only paused drops can be resumed'; end if;
  if exists(select 1 from public.moderation_cleanup where drop_id=d.id and pending) then raise exception 'Finish checkout cleanup before resuming'; end if;
  update public.drops set moderation_state='ACTIVE' where id=d.id;
 elsif p_action in ('SUSPEND','UNSUSPEND') then
  if exists(select 1 from public.moderation_admins where user_id=d.creator_id) then raise exception 'Admin accounts cannot be suspended here'; end if;
  if p_action='UNSUSPEND' and exists(select 1 from public.moderation_cleanup c join public.drops x on x.id=c.drop_id where x.creator_id=d.creator_id and c.pending) then raise exception 'Finish checkout cleanup before restoring this creator'; end if;
  update public.users set creator_suspended=(p_action='SUSPEND') where id=d.creator_id;
 end if;
 if p_action in ('PAUSE','REMOVE','SUSPEND') then
  insert into public.moderation_cleanup(drop_id) select id from public.drops where id=d.id or (p_action='SUSPEND' and creator_id=d.creator_id)
  on conflict(drop_id) do update set pending=true,updated_at=now();
 end if;
 update public.content_reports set status=case when p_action='RETRY_CLEANUP' then status when p_action='DISMISS' then 'DISMISSED' when p_action='RESOLVE' then 'RESOLVED' else 'REVIEWING' end,updated_at=now() where id=r.id;
 insert into public.moderation_audit(id,report_id,actor_id,action,note) values(p_request,r.id,p_actor,p_action,btrim(p_note));
 return d.id;
end; $$;
revoke all on function public.moderate_report(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.moderate_report(uuid,uuid,text,text,uuid) to service_role;
commit;

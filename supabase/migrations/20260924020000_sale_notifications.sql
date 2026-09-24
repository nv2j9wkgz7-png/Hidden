begin;
-- One creator notification per confirmed sale. No buyer email or access token.
create table public.sale_notifications (
 id uuid primary key references public.purchases(id) on delete cascade,
 creator_id uuid not null references public.users(id) on delete cascade,
 drop_id uuid not null references public.drops(id) on delete cascade,
 title text not null,
 amount_cents integer not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 email_sent_at timestamptz,
 email_provider_id text
);
create index sale_notifications_creator_date on public.sale_notifications(creator_id,created_at desc);
alter table public.sale_notifications enable row level security;
revoke all on public.sale_notifications from anon,authenticated;
grant select on public.sale_notifications to authenticated;
grant all on public.sale_notifications to service_role;
create policy sale_notifications_owner on public.sale_notifications for select to authenticated using (creator_id=auth.uid());
create function public.notify_creator_sale() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='PAID' and (tg_op='INSERT' or old.status is distinct from 'PAID') then
  insert into public.sale_notifications(id,creator_id,drop_id,title,amount_cents)
  select new.id,d.creator_id,d.id,d.title,new.amount_cents from public.drops d where d.id=new.drop_id
  on conflict (id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.notify_creator_sale() from public,anon,authenticated;
create trigger purchase_sale_notification after insert or update of status on public.purchases
for each row execute function public.notify_creator_sale();

commit;

-- Creators explicitly choose which package assets are free. Originals stay private.
alter table public.assets add column is_public_preview boolean not null default false;

create function public.set_public_previews(p_drop uuid, p_creator uuid, p_assets uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare d public.drops;
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status not in ('DRAFT','PUBLISHED') or d.moderation_state <> 'ACTIVE'
    or exists(select 1 from public.users where id=p_creator and creator_suspended)
 then raise exception 'Drop is not editable'; end if;
 if p_assets is null or cardinality(p_assets) > 20
    or (select count(distinct id) from unnest(p_assets) id) <> cardinality(p_assets)
    or exists(select 1 from unnest(p_assets) as u(id) where u.id is null or not exists(
      select 1 from public.assets a where a.id=u.id and a.drop_id=p_drop and a.status='READY'))
 then raise exception 'Choose ready files from this drop'; end if;
 update public.assets set is_public_preview=(id=any(p_assets)) where drop_id=p_drop;
end; $$;
revoke all on function public.set_public_previews(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.set_public_previews(uuid,uuid,uuid[]) to service_role;

-- Extend private originals to videos; public previews remain server-generated JPEGs.
alter table public.assets drop constraint assets_mime_type_check;
alter table public.assets add constraint assets_mime_type_check check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'));
alter table public.assets drop constraint assets_size_bytes_check;
alter table public.assets add constraint assets_size_bytes_check check (size_bytes >= 1 and size_bytes <= case when mime_type like 'video/%' then 52428800 else 10485760 end);
alter table public.assets drop constraint assets_drop_id_sort_order_key;
alter table public.assets add constraint assets_drop_id_sort_order_key unique(drop_id,sort_order) deferrable initially immediate;
update storage.buckets set file_size_limit=52428800, allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'] where id='originals';

create or replace function public.reserve_asset(p_drop uuid,p_creator uuid,p_filename text,p_mime text,p_size integer) returns public.assets
language plpgsql security definer set search_path='' as $$
declare d public.drops; a public.assets; n integer; asset_id uuid := gen_random_uuid();
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status <> 'DRAFT' then raise exception 'Drop is not editable'; end if;
 if (select coalesce(sum(size_bytes),0) from public.assets where drop_id=p_drop) + p_size > 209715200 then raise exception 'Maximum 200 MB per drop'; end if;
 select min(slot) into n from generate_series(0,19) slot where not exists(select 1 from public.assets where drop_id=p_drop and sort_order=slot);
 if n is null then raise exception 'Maximum 20 files'; end if;
 insert into public.assets(id,drop_id,storage_path,original_filename,mime_type,size_bytes,sort_order)
 values(asset_id,p_drop,p_creator::text||'/'||p_drop::text||'/'||asset_id::text,p_filename,p_mime,p_size,n) returning * into a;
 return a;
end; $$;

create function public.reorder_draft_assets(p_drop uuid,p_creator uuid,p_assets uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare d public.drops; actual integer;
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status <> 'DRAFT' then raise exception 'Drop is not editable'; end if;
 select count(*) into actual from public.assets where drop_id=p_drop;
 if p_assets is null or cardinality(p_assets) <> actual
    or (select count(distinct id) from unnest(p_assets) id) <> actual
    or exists(select 1 from unnest(p_assets) as u(id) where u.id is null or not exists(select 1 from public.assets a where a.id=u.id and a.drop_id=p_drop))
 then raise exception 'Order must include every file exactly once'; end if;
 set constraints public.assets_drop_id_sort_order_key deferred;
 update public.assets a set sort_order=o.position-1
 from unnest(p_assets) with ordinality as o(id,position)
 where a.id=o.id and a.drop_id=p_drop;
 set constraints public.assets_drop_id_sort_order_key immediate;
end; $$;
revoke all on function public.reorder_draft_assets(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.reorder_draft_assets(uuid,uuid,uuid[]) to service_role;

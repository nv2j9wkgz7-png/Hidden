create function public.update_drop_details(p_drop uuid,p_creator uuid,p_title text,p_price integer,p_description text) returns void
language plpgsql security definer set search_path='' as $$
declare d public.drops;
begin
 select * into d from public.drops where id=p_drop and creator_id=p_creator for update;
 if d.id is null or d.status not in ('PUBLISHED','CLOSING','CLOSED') then raise exception 'Drop is not editable'; end if;
 if p_price <> d.price_cents and exists(select 1 from public.purchases where drop_id=p_drop) then
   raise exception 'Price is locked after checkout starts';
 end if;
 update public.drops set title=p_title,price_cents=p_price,description=p_description where id=p_drop;
end; $$;
revoke all on function public.update_drop_details(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.update_drop_details(uuid,uuid,text,integer,text) to service_role;

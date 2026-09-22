-- Sales state is separate from purchase access: existing PAID purchases stay valid.
alter table public.drops drop constraint drops_status_check;
alter table public.drops add constraint drops_status_check check(status in ('DRAFT','PUBLISHED','CLOSING','CLOSED'));

-- Serialize purchase reservations with the stop-sales update on the drop row.
create function public.require_open_drop() returns trigger language plpgsql set search_path = '' as $$
declare current_status text;
begin
 select status into current_status from public.drops where id=new.drop_id for update;
 if current_status is distinct from 'PUBLISHED' then raise exception 'This drop is closed to new purchases'; end if;
 return new;
end; $$;
create trigger purchase_requires_open_drop before insert on public.purchases for each row execute function public.require_open_drop();
revoke all on function public.require_open_drop() from public, anon, authenticated;

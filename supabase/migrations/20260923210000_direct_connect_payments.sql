alter table public.purchases rename column destination_account_id to stripe_account_id;
-- One account scope per payment, including legacy platform payments (null).
drop function public.apply_payment_event(text,text,uuid,text,integer,text,text,text);
create function public.apply_payment_event(p_provider text,p_event_id text,p_purchase uuid,p_transaction text,p_amount integer,p_currency text,p_kind text,p_email text,p_account text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare purchase public.purchases;
begin
 if p_kind not in ('paid','refunded') then raise exception 'Invalid payment event'; end if;
 select * into purchase from public.purchases where id=p_purchase for update;
 if purchase.id is null then raise exception 'Purchase not found'; end if;
 if purchase.stripe_account_id is distinct from p_account then raise exception 'Payment account mismatch'; end if;
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
revoke all on function public.apply_payment_event(text,text,uuid,text,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_payment_event(text,text,uuid,text,integer,text,text,text,text) to service_role;

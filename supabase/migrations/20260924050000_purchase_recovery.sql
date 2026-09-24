begin;
create table public.purchase_recoveries (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  email text not null check (length(email) between 3 and 254),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  used_at timestamptz,
  used_by uuid references public.users(id) on delete set null,
  claimed_count integer not null default 0
);
alter table public.purchase_recoveries enable row level security;
revoke all on public.purchase_recoveries from public, anon, authenticated;
grant select, insert, update, delete on public.purchase_recoveries to service_role;
create index purchase_recoveries_expiry on public.purchase_recoveries(expires_at);
create index purchases_recovery_email on public.purchases(lower(btrim(customer_email)))
  where buyer_id is null and status = 'PAID';

create function public.claim_recovered_purchases(p_token_hash text, p_buyer_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare proof public.purchase_recoveries; claimed integer;
begin
  select * into proof from public.purchase_recoveries where token_hash = p_token_hash for update;
  if not found or proof.expires_at <= now() or p_buyer_id is null then
    raise exception 'Recovery link invalid or expired';
  end if;
  if proof.used_at is not null then
    if proof.used_by = p_buyer_id then return proof.claimed_count; end if;
    raise exception 'Recovery link already used';
  end if;
  -- Only pre-existing paid, unclaimed purchases. Refunds and ownership changes
  -- are rechecked by UPDATE under row locks, including concurrent claims.
  update public.purchases set buyer_id = p_buyer_id, saved_at = now()
  where buyer_id is null and status = 'PAID' and paid_at is not null
    and paid_at <= proof.created_at
    and lower(btrim(customer_email)) = proof.email;
  get diagnostics claimed = row_count;
  update public.purchase_recoveries set used_at = now(), used_by = p_buyer_id,
    claimed_count = claimed where token_hash = p_token_hash;
  return claimed;
end;
$$;
revoke all on function public.claim_recovered_purchases(text,uuid) from public, anon, authenticated;
grant execute on function public.claim_recovered_purchases(text,uuid) to service_role;
commit;

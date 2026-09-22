-- Only service_role can read or update purchases; retain existing RLS/grants.
alter table public.purchases
  add column email_access_token text unique,
  add column email_sent_at timestamptz,
  add column email_provider_id text;
create index purchases_unsent_email on public.purchases(created_at)
  where status = 'PAID' and email_sent_at is null and customer_email is not null;

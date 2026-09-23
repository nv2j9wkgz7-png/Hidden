-- Existing accounts do not receive an unsolicited welcome email.
alter table public.users add column welcome_email_pending boolean not null default false;
alter table public.users alter column welcome_email_pending set default true;
alter table public.users add column welcome_email_sent_at timestamptz;

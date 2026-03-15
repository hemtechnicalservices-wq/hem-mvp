create table if not exists public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system',
  source text not null default 'api',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_status_history_job_created_at
  on public.job_status_history (job_id, created_at desc);

create index if not exists idx_job_status_history_actor_created_at
  on public.job_status_history (actor_user_id, created_at desc);

create table if not exists public.action_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system',
  entity_type text not null,
  entity_id text not null,
  event_type text not null,
  source text not null default 'api',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_action_audit_logs_entity_created_at
  on public.action_audit_logs (entity_type, entity_id, created_at desc);

create index if not exists idx_action_audit_logs_actor_created_at
  on public.action_audit_logs (actor_user_id, created_at desc);

alter table if exists public.job_status_history enable row level security;
alter table if exists public.action_audit_logs enable row level security;

drop policy if exists job_status_history_select_policy on public.job_status_history;
drop policy if exists job_status_history_write_policy on public.job_status_history;
drop policy if exists action_audit_logs_select_policy on public.action_audit_logs;
drop policy if exists action_audit_logs_write_policy on public.action_audit_logs;

create policy job_status_history_select_policy
on public.job_status_history
for select
using (public.has_ops_access());

create policy job_status_history_write_policy
on public.job_status_history
for all
using (public.has_ops_access())
with check (public.has_ops_access());

create policy action_audit_logs_select_policy
on public.action_audit_logs
for select
using (public.has_ops_access());

create policy action_audit_logs_write_policy
on public.action_audit_logs
for all
using (public.has_ops_access())
with check (public.has_ops_access());


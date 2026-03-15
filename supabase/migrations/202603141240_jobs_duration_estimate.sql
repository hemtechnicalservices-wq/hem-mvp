alter table if exists public.jobs
  add column if not exists estimated_duration_minutes integer;

alter table if exists public.jobs
  add column if not exists estimated_by_technician_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'jobs'
      and constraint_name = 'jobs_estimated_duration_minutes_check'
  ) then
    alter table public.jobs
      add constraint jobs_estimated_duration_minutes_check
      check (estimated_duration_minutes is null or (estimated_duration_minutes >= 5 and estimated_duration_minutes <= 1440));
  end if;
end $$;

create index if not exists idx_jobs_estimated_duration_minutes
  on public.jobs (estimated_duration_minutes);

do $$
begin
  if to_regclass('public.jobs') is null then
    raise notice 'jobs table does not exist; skipping status constraint migration';
    return;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'jobs_status_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    execute 'alter table public.jobs drop constraint jobs_status_check';
  end if;

  execute $sql$
    alter table public.jobs
    add constraint jobs_status_check
    check (
      status in (
        'new',
        'pending_review',
        'waiting_quote',
        'quote_prepared',
        'approved',
        'scheduled',
        'assigned',
        'technician_assigned',
        'on_the_way',
        'in_progress',
        'completed',
        'done',
        'invoice_generated',
        'paid',
        'cancelled'
      )
    )
  $sql$;
end $$;

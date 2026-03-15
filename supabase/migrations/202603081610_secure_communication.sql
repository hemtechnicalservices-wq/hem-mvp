create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  client_id uuid null references public.profiles(id) on delete set null,
  technician_id uuid null references public.profiles(id) on delete set null,
  status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz null
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  message_type text not null default 'text',
  message_text text null,
  attachment_url text null,
  is_read boolean not null default false,
  sent_at timestamptz null,
  delivered_at timestamptz null,
  seen_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  conversation_id uuid null references public.conversations(id) on delete set null,
  caller_user_id uuid not null references public.profiles(id) on delete cascade,
  caller_role text not null,
  receiver_user_id uuid null references public.profiles(id) on delete set null,
  receiver_role text null,
  call_type text not null default 'masked_placeholder',
  call_status text not null default 'initiated',
  started_at timestamptz null,
  ended_at timestamptz null,
  duration_seconds integer null,
  provider_reference text null,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_permissions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  chat_enabled boolean not null default false,
  call_enabled boolean not null default false,
  enabled_at timestamptz null,
  disabled_at timestamptz null,
  disable_reason text null
);

create index if not exists idx_conversations_job_id on public.conversations(job_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index if not exists idx_messages_unread on public.messages(conversation_id, is_read);
create index if not exists idx_call_logs_job_created on public.call_logs(job_id, created_at);

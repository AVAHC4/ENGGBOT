-- Supabase schema for per-account conversations and messages
-- Apply this via Supabase SQL editor or supabase CLI

-- Extensions (Supabase usually has these available)
create extension if not exists pgcrypto;

-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null default 'New conversation',
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null default '',
  status text not null default 'completed' check (status in ('draft','streaming','completed','error')),
  reply_to_id uuid null,
  model text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_conversations_user_updated on public.conversations(user_id, updated_at desc);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at asc);

-- Trigger function to bump updated_at on conversations when messages change
create or replace function public.bump_conversation_updated_at()
returns trigger as $$
begin
  update public.conversations set updated_at = now() where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql security definer;

-- Triggers
create trigger trg_messages_touch_conversation
  after insert or update on public.messages
  for each row execute function public.bump_conversation_updated_at();

-- Row Level Security
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies: owner-only access
create policy if not exists conversations_owner_select on public.conversations
  for select using (auth.uid()::text = user_id);
create policy if not exists conversations_owner_modify on public.conversations
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy if not exists messages_owner_select on public.messages
  for select using (auth.uid()::text = user_id);
create policy if not exists messages_owner_modify on public.messages
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Note: Service Role bypasses RLS, which our server-side admin client uses.
